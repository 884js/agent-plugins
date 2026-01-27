#!/bin/bash
# セーブポイントとの差分を表示

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

# 引数を解析
TAG1="$1"
TAG2="$2"

# 引数がない場合、最新のタグを取得
if [ -z "$TAG1" ]; then
  TAG1=$(git -C "$REPO_PATH" tag -l 'savepoint/*' --sort=-creatordate | head -1)
  if [ -z "$TAG1" ]; then
    echo "エラー: セーブポイントがありません"
    exit 1
  fi
fi

# タグ名を正規化
if [[ "$TAG1" != savepoint/* ]]; then
  TAG1="savepoint/$TAG1"
fi
if [ -n "$TAG2" ] && [[ "$TAG2" != savepoint/* ]]; then
  TAG2="savepoint/$TAG2"
fi

# タグが存在するか確認
if ! git -C "$REPO_PATH" rev-parse "$TAG1" >/dev/null 2>&1; then
  echo "エラー: セーブポイント '$TAG1' が見つかりません"
  exit 1
fi
if [ -n "$TAG2" ] && ! git -C "$REPO_PATH" rev-parse "$TAG2" >/dev/null 2>&1; then
  echo "エラー: セーブポイント '$TAG2' が見つかりません"
  exit 1
fi

if [ -z "$TAG2" ]; then
  # 現在との差分
  # プロジェクトの最新状態をリポジトリに同期（コミットなし）
  sync_to_repo "$PWD"

  echo "変更されたファイル ($TAG1 → 現在):"
  git -C "$REPO_PATH" diff --name-status "$TAG1"
  echo ""
  git -C "$REPO_PATH" diff "$TAG1"
else
  # セーブポイント間の差分
  echo "変更されたファイル ($TAG1 → $TAG2):"
  git -C "$REPO_PATH" diff --name-status "$TAG1" "$TAG2"
  echo ""
  git -C "$REPO_PATH" diff "$TAG1" "$TAG2"
fi
