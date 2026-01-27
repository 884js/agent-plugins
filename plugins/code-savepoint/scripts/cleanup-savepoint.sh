#!/bin/bash
# セッション終了時にセーブポイントリポジトリを削除

# ユーティリティ関数を読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/savepoint-utils.sh"

# stdinからJSONを読み取り（フック入力）
HOOK_INPUT=$(cat)

# プロジェクトディレクトリ（カレントディレクトリ）
PROJECT_PATH="$PWD"

# .claude/ 配下は対象外
if [[ "$PROJECT_PATH" == *"/.claude/"* ]] || [[ "$PROJECT_PATH" == *"/.claude" ]]; then
  exit 0
fi

# セーブポイントリポジトリのパスを取得（セッションID付き）
REPO_PATH="$(get_repo_path "$PROJECT_PATH")"
BASE_DIR="$(dirname "$REPO_PATH")"  # /repo の親ディレクトリ

# ベースディレクトリが存在すれば削除（diffs/, config.json なども含む）
if [ -d "$BASE_DIR" ]; then
  rm -rf "$BASE_DIR"
  echo "セーブポイントをクリーンアップしました" >&2
fi

# セッションファイルも削除
clear_session_id "$PROJECT_PATH"

exit 0
