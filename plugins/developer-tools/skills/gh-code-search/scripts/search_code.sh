#!/bin/bash
# gh-code-search: GitHub リポジトリからコードを検索するスクリプト

set -euo pipefail

# デフォルト値
LANGUAGE=""  # 空の場合は言語フィルタなし
PATH_FILTER=""
SHOW_CONTENT=false
LIMIT=10
BRANCH=""  # 空の場合はデフォルトブランチを自動取得

# 使用方法
usage() {
    cat << EOF
Usage: $(basename "$0") <owner/repo> <query> [options]

GitHub リポジトリからコードを検索します。

Arguments:
  owner/repo    検索対象のリポジトリ (例: myorg/backend-api)
  query         検索クエリ

Options:
  --language <lang>    言語でフィルタ (例: go, typescript, python)
  --path <path>        パスでフィルタ (例: internal/handler)
  --show-content       ファイル内容も表示
  --limit <n>          結果数制限 (default: 10)
  --branch <branch>    ブランチ指定 (default: リポジトリのデフォルトブランチ)
  -h, --help           このヘルプを表示

Examples:
  $(basename "$0") myorg/api "func.*Handler" --language go
  $(basename "$0") myorg/api "type.*Request struct" --show-content --limit 5
  $(basename "$0") myorg/api "e.POST" --path internal/handler
EOF
    exit 0
}

# ヘルプオプションを先にチェック
for arg in "$@"; do
    case "$arg" in
        -h|--help)
            usage
            ;;
    esac
done

# 引数パース
if [[ $# -lt 2 ]]; then
    echo "Error: リポジトリとクエリは必須です" >&2
    echo "Usage: $(basename "$0") <owner/repo> <query> [options]"
    echo "詳細は --help を参照してください"
    exit 1
fi

REPO="$1"
QUERY="$2"
shift 2

while [[ $# -gt 0 ]]; do
    case "$1" in
        --language)
            LANGUAGE="$2"
            shift 2
            ;;
        --path)
            PATH_FILTER="$2"
            shift 2
            ;;
        --show-content)
            SHOW_CONTENT=true
            shift
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Error: 不明なオプション: $1" >&2
            exit 1
            ;;
    esac
done

# gh CLI 認証確認
if ! gh auth status &>/dev/null; then
    echo "Error: gh CLI が認証されていません。'gh auth login' を実行してください。" >&2
    exit 1
fi

# 検索クエリ構築（pathはクエリ内で指定）
FULL_QUERY="$QUERY"
if [[ -n "$PATH_FILTER" ]]; then
    FULL_QUERY="$QUERY path:$PATH_FILTER"
fi

if [[ -n "$LANGUAGE" ]]; then
    echo "=== 検索: '$FULL_QUERY' in $REPO (lang: $LANGUAGE) ==="
else
    echo "=== 検索: '$FULL_QUERY' in $REPO ==="
fi
echo ""

# コード検索実行
if [[ -n "$LANGUAGE" ]]; then
    RESULTS=$(gh search code "$FULL_QUERY" --repo "$REPO" --language "$LANGUAGE" --limit "$LIMIT" --json repository,path,textMatches 2>/dev/null || echo "[]")
else
    RESULTS=$(gh search code "$FULL_QUERY" --repo "$REPO" --limit "$LIMIT" --json repository,path,textMatches 2>/dev/null || echo "[]")
fi

if [[ "$RESULTS" == "[]" || -z "$RESULTS" ]]; then
    echo "検索結果がありません"
    exit 0
fi

# 結果をパースして表示
echo "$RESULTS" | jq -r '.[] | "📄 \(.path)"' | sort -u

echo ""
echo "=== 詳細 ==="

# ファイル内容表示オプション
if [[ "$SHOW_CONTENT" == true ]]; then
    # ブランチが未指定の場合、デフォルトブランチを取得
    if [[ -z "$BRANCH" ]]; then
        BRANCH=$(gh api "repos/$REPO" --jq '.default_branch' 2>/dev/null || echo "main")
        echo "Using branch: $BRANCH"
        echo ""
    fi

    # ユニークなファイルパスを取得
    UNIQUE_PATHS=$(echo "$RESULTS" | jq -r '.[].path' | sort -u | head -n "$LIMIT")

    for FILE_PATH in $UNIQUE_PATHS; do
        echo ""
        echo "--- $FILE_PATH ---"
        # gh api を使ってファイル内容を取得
        CONTENT=$(gh api "repos/$REPO/contents/$FILE_PATH?ref=$BRANCH" --jq '.content' 2>/dev/null | base64 -d 2>/dev/null || echo "")
        if [[ -n "$CONTENT" ]]; then
            echo "$CONTENT"
        else
            echo "(ファイル内容を取得できませんでした)"
        fi
        echo ""
    done
else
    # マッチしたテキストを表示
    echo "$RESULTS" | jq -r '.[] | "File: \(.path)\nMatches:\n\(.textMatches | map("  - \(.fragment)") | join("\n"))\n"'
fi

echo ""
echo "合計: $(echo "$RESULTS" | jq -r '.[].path' | sort -u | wc -l | tr -d ' ') ファイル"
