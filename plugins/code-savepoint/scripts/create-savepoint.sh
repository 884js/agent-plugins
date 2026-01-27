#!/bin/bash
# Gitベースのセーブポイント作成スクリプト

# ユーティリティ関数を読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/savepoint-utils.sh"

# stdinからJSONを読み取り（フック入力）
HOOK_INPUT=$(cat)
SESSION_ID=$(echo "$HOOK_INPUT" | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
HOOK_EVENT=$(echo "$HOOK_INPUT" | grep -o '"hook_event_name"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')

# プロジェクトディレクトリ（カレントディレクトリ）
PROJECT_PATH="$PWD"

# .claude/ 配下はセーブポイント対象外
if [[ "$PROJECT_PATH" == *"/.claude/"* ]] || [[ "$PROJECT_PATH" == *"/.claude" ]]; then
  exit 0
fi

# SessionStartの場合、セッションIDを保存
if [ -n "$SESSION_ID" ]; then
  save_session_id "$SESSION_ID" "$PROJECT_PATH"
fi

# セーブポイントリポジトリを初期化（初回のみ）
REPO_PATH="$(init_repo "$PROJECT_PATH")"

# プロジェクトファイルをリポジトリに同期
sync_to_repo "$PROJECT_PATH"

# 変更をコミット
cd "$REPO_PATH" || exit 1

# 変更があるか確認
git add -A
if git diff --cached --quiet; then
  # 変更なし
  git reset --quiet HEAD
  exit 0
fi

# コミットを作成
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
git commit --quiet -m "Savepoint: $TIMESTAMP"

# 前のセーブポイントを取得（タグ作成前に取得する必要がある）
PREV_TAG=$(git tag -l 'savepoint/*' --sort=-creatordate | head -1)

# タグを作成
TAG_NAME="savepoint/sp-$TIMESTAMP"
DIFF_BASENAME="sp-$TIMESTAMP"

# 要約を生成（変更ファイル名リスト）
if [ -z "$PREV_TAG" ]; then
  SUMMARY="Initial savepoint"
else
  # 変更ファイル名を取得（最大3ファイル）
  CHANGED_FILES=$(git diff --name-only "$PREV_TAG" HEAD | head -3 | tr '\n' ', ' | sed 's/,$//')
  if [ -n "$CHANGED_FILES" ]; then
    SUMMARY="Changed: $CHANGED_FILES"
  else
    SUMMARY="No changes"
  fi
fi

# アノテーション付きタグを作成
git tag -a -m "$SUMMARY" "$TAG_NAME"

# diffを保存
DIFF_DIR="$(get_diffs_dir "$REPO_PATH")"
DIFF_FILE="$DIFF_DIR/$DIFF_BASENAME.diff"

if [ -z "$PREV_TAG" ]; then
  # 初回セーブポイント
  echo "Initial savepoint" > "$DIFF_FILE"
else
  # 前のセーブポイントとのdiffを保存
  git diff "$PREV_TAG" "$TAG_NAME" > "$DIFF_FILE"
fi

echo "セーブポイント作成: $TAG_NAME" >&2
exit 0
