#!/bin/bash
# セーブポイント一覧を表示

set -e

# ユーティリティ関数を読み込み
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$PLUGIN_ROOT/scripts/savepoint-utils.sh"

# リポジトリパスを取得
REPO_PATH="$(get_repo_path "$PWD")"

# リポジトリが存在するか確認
if [ ! -d "$REPO_PATH/.git" ]; then
  echo "このプロジェクトにはセーブポイントがありません"
  exit 0
fi

# セーブポイント一覧を取得（タグ名、作成日、要約）
echo "セーブポイント一覧:"
echo ""

git -C "$REPO_PATH" for-each-ref \
  --format='%(refname:short)|%(creatordate:short)|%(contents:subject)' \
  --sort=-creatordate \
  refs/tags/savepoint/ | while IFS='|' read -r tag date summary; do
  # タグ名から savepoint/ プレフィックスを除去
  short_tag="${tag#savepoint/}"
  # 要約がなければデフォルトを表示
  if [ -z "$summary" ]; then
    summary="(要約なし)"
  fi
  echo "  [$short_tag] $date"
  echo "    $summary"
  echo ""
done
