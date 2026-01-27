#!/bin/bash
# セーブポイント共通ユーティリティ関数（最小限）

# セーブポイントリポジトリのベースディレクトリ
SAVEPOINT_REPOS_BASE="$HOME/.claude/savepoint-repos"

# プロジェクトパスから12文字のハッシュを計算
get_project_hash() {
  local project_path="${1:-$PWD}"
  local real_path
  real_path="$(cd "$project_path" 2>/dev/null && pwd -P)" || real_path="$project_path"
  echo -n "$real_path" | shasum -a 256 | cut -c1-12
}

# 現在のセッションIDを取得
# 1. 一時ファイルをチェック（新規セッション用）
# 2. なければ最新のセッションディレクトリのconfig.jsonから読み取り
get_session_id() {
  local project_path="${1:-$PWD}"
  local project_hash
  project_hash="$(get_project_hash "$project_path")"

  # 一時ファイルをまずチェック
  local temp_session_file="$SAVEPOINT_REPOS_BASE/.pending-session-$project_hash"
  if [ -f "$temp_session_file" ]; then
    cat "$temp_session_file"
    return
  fi

  # 最新のセッションディレクトリのconfig.jsonから読み取り
  local latest_dir
  latest_dir=$(find "$SAVEPOINT_REPOS_BASE" -maxdepth 1 -type d -name "${project_hash}-*" 2>/dev/null | sort -r | head -1)
  if [ -n "$latest_dir" ] && [ -f "$latest_dir/config.json" ]; then
    grep '"session_id"' "$latest_dir/config.json" 2>/dev/null | sed 's/.*: *"\([^"]*\)".*/\1/'
  fi
}

# セッションIDを一時保存（init_repoでconfig.jsonに移動される）
save_session_id() {
  local session_id="$1"
  local project_path="${2:-$PWD}"
  local project_hash
  project_hash="$(get_project_hash "$project_path")"

  mkdir -p "$SAVEPOINT_REPOS_BASE"
  echo "$session_id" > "$SAVEPOINT_REPOS_BASE/.pending-session-$project_hash"
}

# 一時セッションファイルを削除
clear_pending_session() {
  local project_path="${1:-$PWD}"
  local project_hash
  project_hash="$(get_project_hash "$project_path")"

  rm -f "$SAVEPOINT_REPOS_BASE/.pending-session-$project_hash"
}

# プロジェクトのセーブポイントベースディレクトリパスを取得
get_base_dir() {
  local project_path="${1:-$PWD}"
  local project_hash
  project_hash="$(get_project_hash "$project_path")"
  local session_id
  session_id="$(get_session_id "$project_path")"

  if [ -n "$session_id" ]; then
    echo "$SAVEPOINT_REPOS_BASE/${project_hash}-${session_id}"
  else
    echo "$SAVEPOINT_REPOS_BASE/$project_hash"
  fi
}

# プロジェクトのセーブポイントリポジトリパスを取得（repo/サブディレクトリ）
get_repo_path() {
  local project_path="${1:-$PWD}"
  echo "$(get_base_dir "$project_path")/repo"
}

# diffsディレクトリパスを取得
get_diffs_dir() {
  local repo_path="$1"
  echo "$(dirname "$repo_path")/diffs"
}

# config.jsonパスを取得
get_config_file() {
  local repo_path="$1"
  echo "$(dirname "$repo_path")/config.json"
}

# セーブポイントリポジトリを初期化
init_repo() {
  local project_path="${1:-$PWD}"
  local base_dir
  base_dir="$(get_base_dir "$project_path")"
  local repo_path="$base_dir/repo"
  local diffs_dir="$base_dir/diffs"
  local config_file="$base_dir/config.json"

  if [ ! -d "$repo_path/.git" ]; then
    mkdir -p "$repo_path" "$diffs_dir"
    git -C "$repo_path" init --quiet

    local real_path
    real_path="$(cd "$project_path" 2>/dev/null && pwd -P)" || real_path="$project_path"

    # セッションIDを取得
    local session_id
    session_id="$(get_session_id "$project_path")"

    # config.json をベースディレクトリ直下に作成（repo/ の外）
    cat > "$config_file" <<EOF
{
  "source_path": "$real_path",
  "session_id": "$session_id",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    # 一時セッションファイルを削除
    clear_pending_session "$project_path"

    # 空のコミットで初期化
    git -C "$repo_path" commit --quiet --allow-empty -m "Initialize savepoint repository"
  fi

  echo "$repo_path"
}

# プロジェクトファイルをリポジトリに同期（git管理プロジェクトのみ対応）
sync_to_repo() {
  local project_path="${1:-$PWD}"
  local repo_path
  repo_path="$(get_repo_path "$project_path")"

  # git管理プロジェクトのみ対応
  if ! git -C "$project_path" rev-parse --git-dir > /dev/null 2>&1; then
    echo "警告: git管理されていないプロジェクトはセーブポイント対象外です" >&2
    return 1
  fi

  # git ls-files のファイルのみ同期
  local temp_src_list temp_dst_list temp_delete_list
  temp_src_list=$(mktemp)
  temp_dst_list=$(mktemp)
  temp_delete_list=$(mktemp)

  git -C "$project_path" ls-files | sort > "$temp_src_list"

  # rsync でファイル同期（変更ファイルのみ転送）
  rsync -a --files-from="$temp_src_list" "$project_path/" "$repo_path/"

  # 宛先側のファイルリスト（.git以外）
  find "$repo_path" -type f ! -path '*/.git/*' | \
    sed "s|^$repo_path/||" | sort > "$temp_dst_list"

  # 削除すべきファイル = 宛先にあってソースにないファイル
  comm -23 "$temp_dst_list" "$temp_src_list" > "$temp_delete_list"

  # 一括削除
  if [ -s "$temp_delete_list" ]; then
    sed "s|^|$repo_path/|" "$temp_delete_list" | xargs rm -f
    find "$repo_path" -type d -empty ! -path '*/.git/*' -delete 2>/dev/null || true
  fi

  rm -f "$temp_src_list" "$temp_dst_list" "$temp_delete_list"
}

# リポジトリからプロジェクトに同期（復元）
sync_from_repo() {
  local repo_path="$1"
  local project_path="$2"

  if [ -z "$repo_path" ] || [ -z "$project_path" ]; then
    echo "エラー: リポジトリパスとプロジェクトパスが必要です" >&2
    return 1
  fi

  rsync -a --exclude='.git' "$repo_path/" "$project_path/"
}
