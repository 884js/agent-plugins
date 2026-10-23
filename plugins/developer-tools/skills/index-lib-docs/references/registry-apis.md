# パッケージレジストリAPI仕様

各言語のパッケージレジストリからドキュメントURL等を取得するAPI仕様。

## npm (Node.js)

### 基本API

**エンドポイント:** `https://registry.npmjs.org/{package}`

**通常パッケージ:**
```bash
curl -fLsS "https://registry.npmjs.org/react" | jq '{
  name: .name,
  version: .["dist-tags"].latest,
  homepage: .homepage,
  repository: .repository.url,
  description: .description
}'
```

**スコープ付きパッケージ:**
```bash
# @scope/package → %40scope%2Fpackage にURLエンコード
PACKAGE="@tanstack/react-query"
ENCODED=$(echo "$PACKAGE" | sed 's/@/%40/g; s/\//%2F/g')
curl -fLsS "https://registry.npmjs.org/$ENCODED"
```

### レスポンス例

```json
{
  "name": "react",
  "dist-tags": {
    "latest": "18.2.0"
  },
  "homepage": "https://react.dev/",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/facebook/react.git"
  },
  "description": "React is a JavaScript library for building user interfaces."
}
```

### ドキュメントURL特定ロジック

```bash
get_docs_url() {
  local package="$1"
  local encoded=$(echo "$package" | sed 's/@/%40/g; s/\//%2F/g')
  local data=$(curl -fLsS "https://registry.npmjs.org/$encoded")

  # 優先順位: homepage > repository
  local homepage=$(echo "$data" | jq -r '.homepage // empty')
  if [ -n "$homepage" ]; then
    echo "$homepage"
    return
  fi

  local repo=$(echo "$data" | jq -r '.repository.url // empty')
  if [ -n "$repo" ]; then
    # git+https://github.com/... → https://github.com/...
    echo "$repo" | sed 's/^git+//' | sed 's/\.git$//'
    return
  fi

  # fallback: npmjs.com のパッケージページ
  echo "https://www.npmjs.com/package/$package"
}
```

---

## PyPI (Python)

### 基本API

**エンドポイント:** `https://pypi.org/pypi/{package}/json`

```bash
curl -fLsS "https://pypi.org/pypi/requests/json" | jq '{
  name: .info.name,
  version: .info.version,
  homepage: .info.home_page,
  project_url: .info.project_url,
  docs_url: .info.docs_url,
  description: .info.summary
}'
```

### レスポンス例

```json
{
  "info": {
    "name": "requests",
    "version": "2.31.0",
    "home_page": "https://requests.readthedocs.io",
    "project_url": "https://pypi.org/project/requests/",
    "docs_url": null,
    "summary": "Python HTTP for Humans.",
    "project_urls": {
      "Documentation": "https://requests.readthedocs.io",
      "Source": "https://github.com/psf/requests"
    }
  }
}
```

### ドキュメントURL特定ロジック

```bash
get_python_docs_url() {
  local package="$1"
  local data=$(curl -fLsS "https://pypi.org/pypi/$package/json")

  # 優先順位: docs_url > project_urls.Documentation > home_page
  local docs_url=$(echo "$data" | jq -r '.info.docs_url // empty')
  if [ -n "$docs_url" ] && [ "$docs_url" != "null" ]; then
    echo "$docs_url"
    return
  fi

  local doc_url=$(echo "$data" | jq -r '.info.project_urls.Documentation // empty')
  if [ -n "$doc_url" ]; then
    echo "$doc_url"
    return
  fi

  local home_page=$(echo "$data" | jq -r '.info.home_page // empty')
  if [ -n "$home_page" ] && [ "$home_page" != "null" ]; then
    echo "$home_page"
    return
  fi

  # fallback
  echo "https://pypi.org/project/$package/"
}
```

---

## crates.io (Rust)

### 基本API

**エンドポイント:** `https://crates.io/api/v1/crates/{crate}`

```bash
curl -fLsS -H "User-Agent: auto-lib-docs" "https://crates.io/api/v1/crates/serde" | jq '{
  name: .crate.name,
  version: .crate.newest_version,
  homepage: .crate.homepage,
  repository: .crate.repository,
  documentation: .crate.documentation,
  description: .crate.description
}'
```

### 注意事項

- User-Agentヘッダーが必須
- レートリミットあり（1リクエスト/秒程度が安全）

### ドキュメントURL特定ロジック

```bash
get_rust_docs_url() {
  local crate="$1"
  local data=$(curl -fLsS -H "User-Agent: auto-lib-docs" "https://crates.io/api/v1/crates/$crate")

  # 優先順位: documentation > docs.rs > homepage
  local docs=$(echo "$data" | jq -r '.crate.documentation // empty')
  if [ -n "$docs" ]; then
    echo "$docs"
    return
  fi

  # docs.rs は全crateのドキュメントをホスト
  echo "https://docs.rs/$crate"
}
```

---

## pkg.go.dev (Go)

### 基本情報

Goにはnpmのようなパッケージレジストリがないが、pkg.go.devがドキュメントを提供。

**ドキュメントURL:**
```
https://pkg.go.dev/{module_path}
```

例:
- `https://pkg.go.dev/github.com/gin-gonic/gin`
- `https://pkg.go.dev/golang.org/x/sync`

### APIエンドポイント

pkg.go.devには公式APIがないため、モジュールパスから直接URLを構築:

```bash
get_go_docs_url() {
  local module="$1"
  echo "https://pkg.go.dev/$module"
}
```

---

## llms.txt 確認

各ドキュメントサイトで llms.txt の存在を確認:

```bash
check_llms_txt() {
  local docs_url="$1"
  local llms_url="${docs_url%/}/llms.txt"

  # HEAD リクエストで存在確認
  local status=$(curl -sI "$llms_url" 2>/dev/null | head -1 | awk '{print $2}')

  if [ "$status" = "200" ]; then
    echo "$llms_url"
  else
    echo ""
  fi
}
```

### 既知のllms.txt対応サイト

| ライブラリ | llms.txt URL |
|------------|--------------|
| Expo | https://docs.expo.dev/llms.txt |
| Vercel | https://vercel.com/llms.txt |
| Next.js | https://nextjs.org/llms.txt |
| Tamagui | https://tamagui.dev/llms.txt |
| TanStack Query | https://tanstack.com/query/latest/llms.txt |

---

## バッチ処理

多数のパッケージを処理する場合の最適化:

```bash
# 並列でAPI呼び出し（xargsを使用）
echo "react next typescript" | tr ' ' '\n' | \
  xargs -P 5 -I {} sh -c 'curl -fLsS "https://registry.npmjs.org/{}" | jq -r ".homepage"'
```

### レートリミット対策

```bash
# 0.5秒間隔でリクエスト
for pkg in react next typescript; do
  curl -fLsS "https://registry.npmjs.org/$pkg" | jq -r '.homepage'
  sleep 0.5
done
```

---

## エラーハンドリング

### パッケージが見つからない

```bash
# 404チェック
check_package_exists() {
  local package="$1"
  local encoded=$(echo "$package" | sed 's/@/%40/g; s/\//%2F/g')
  local status=$(curl -sI "https://registry.npmjs.org/$encoded" | head -1 | awk '{print $2}')

  [ "$status" = "200" ]
}
```

### タイムアウト

```bash
# 5秒でタイムアウト
curl -fLsS --max-time 5 "https://registry.npmjs.org/react"
```

---

## Web検索ツールによるドキュメントサイト発見

レジストリAPIで十分な情報が得られない場合のフォールバック戦略。

### 使用条件

以下の場合にWeb検索ツールを使用:
- レジストリAPIからhomepageが取得できない
- homepageがGitHubリポジトリのみ
- より良い公式ドキュメントサイトが存在する可能性がある

### 検索クエリパターン

| ケース | クエリ |
|--------|--------|
| 基本 | `{package} documentation` |
| 公式サイト優先 | `{package} official documentation` |
| API Reference | `{package} API reference` |

### 検索結果の評価

優先順位:
1. `*.dev` ドメイン（react.dev, zod.dev等）
2. `docs.*` サブドメイン（docs.expo.dev等）
3. `/docs` パスを含むURL
4. 公式ウェブサイト
5. GitHub README

### 実装例

```
# レジストリAPIでhomepageがGitHubの場合
homepage = "https://github.com/facebook/react"

# Web検索ツールで公式ドキュメントを検索
検索クエリ: react documentation official
→ react.dev が見つかる → これを使用

# homepageが見つからない場合
検索クエリ: zod typescript validation documentation
→ zod.dev が見つかる → これを使用
```
