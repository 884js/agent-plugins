#!/bin/bash
# 指定したセーブポイントに戻す

set -e

# 引数チェック
if [ -z "$1" ]; then
  echo "エラー: セーブポイント名を指定してください"
  echo "使用方法: restore.sh <savepoint-name>"
  echo "例: restore.sh sp-20250126-153045"
  exit 1
fi

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

# タグ名を正規化（savepoint/プレフィックスを追加）
TAG_NAME="$1"
if [[ "$TAG_NAME" != savepoint/* ]]; then
  TAG_NAME="savepoint/$TAG_NAME"
fi

# 指定されたタグが存在するか確認
if ! git -C "$REPO_PATH" rev-parse "$TAG_NAME" >/dev/null 2>&1; then
  echo "エラー: セーブポイント '$TAG_NAME' が見つかりません"
  exit 1
fi

# リポジトリをセーブポイントの状態にリセット
git -C "$REPO_PATH" reset --hard "$TAG_NAME" >/dev/null 2>&1

# 設定ファイルからソースパスを取得
CONFIG_FILE="$(get_config_file "$REPO_PATH")"
SOURCE_PATH=$(grep '"source_path"' "$CONFIG_FILE" | sed 's/.*: *"\([^"]*\)".*/\1/')

# リポジトリからプロジェクトディレクトリにファイルを同期
sync_from_repo "$REPO_PATH" "$SOURCE_PATH"

# 結果を出力
echo "復元完了: $TAG_NAME"
