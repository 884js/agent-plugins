#!/bin/bash
# 直前のセーブポイントに戻す

set -e

# ユーティリティ関数を読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$PLUGIN_ROOT/scripts/savepoint-utils.sh"

# リポジトリパスを取得
REPO_PATH="$(get_repo_path "$PWD")"

# リポジトリが存在するか確認
if [ ! -d "$REPO_PATH/.git" ]; then
  echo "エラー: セーブポイントが見つかりません"
  exit 1
fi

# 直前のセーブポイントタグを取得（最新の1つ前）
TARGET_TAG=$(git -C "$REPO_PATH" tag -l 'savepoint/*' --sort=-creatordate | head -2 | tail -1)

# 1つ前がない場合（セーブポイントが1つしかない場合）は最新を使用
if [ -z "$TARGET_TAG" ]; then
  TARGET_TAG=$(git -C "$REPO_PATH" tag -l 'savepoint/*' --sort=-creatordate | head -1)
fi

if [ -z "$TARGET_TAG" ]; then
  echo "エラー: セーブポイントがありません"
  exit 1
fi

# リポジトリをセーブポイントの状態にリセット
git -C "$REPO_PATH" reset --hard "$TARGET_TAG" >/dev/null 2>&1

# 設定ファイルからソースパスを取得
CONFIG_FILE="$(get_config_file "$REPO_PATH")"
SOURCE_PATH=$(grep '"source_path"' "$CONFIG_FILE" | sed 's/.*: *"\([^"]*\)".*/\1/')

# リポジトリからプロジェクトディレクトリにファイルを同期
sync_from_repo "$REPO_PATH" "$SOURCE_PATH"

# 結果を出力
echo "復元完了: $TARGET_TAG"
