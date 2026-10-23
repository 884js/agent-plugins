# クローリングガイド

Web取得ツール および curl を使ったドキュメント取得の**技術的詳細**。

> **Note:** 実行フローはSKILL.mdを参照。このファイルは取得方法の詳細に特化。

## 取得方法の使い分け

| ケース | 推奨方法 | 理由 |
|--------|----------|------|
| llms.txt | **curl** | Web取得ツールは大きなファイルを要約する場合がある |
| 軽量クロール（タイトル+概要抽出） | **Web取得ツール** | 必要な情報だけを効率的に抽出 |
| スキル発動時の詳細取得 | **Web取得ツール** | 都度最新情報を取得 |

## llms.txtファイルの取得

llms.txtはLLM向けに最適化されたドキュメントファイル。**Web取得ツールではなくcurlで直接ダウンロード**する。

### なぜcurlを使うのか

- Web取得ツールは大きなファイルを要約する場合がある
- llms.txtは数百KB〜数MBになることがある
- curlなら完全な内容をそのまま取得できる

### 手順

1. llms.txtを確認
2. llms.txtのみをcurlでダウンロード（llms-full.txtは無視）
3. referencesディレクトリに.md拡張子で保存

### コマンド例

参照資料の拡張子はテンプレートに合わせて `.md` にする。`SKILLS_ROOT` はSKILL.mdで決めた出力先の絶対パスを使う。

```bash
# ディレクトリ作成
mkdir -p "$SKILLS_ROOT/{library}"/references

# llms.txtのみダウンロード（llms-full.txtは不要）
curl -fLsS https://example.com/llms.txt -o "$SKILLS_ROOT/{library}"/references/docs.md
```

### llms.txtの一般的なパターン

| サイト | llms.txt URL |
|--------|--------------|
| Expo | https://docs.expo.dev/llms.txt |
| Vercel | https://vercel.com/llms.txt |
| Tamagui | https://tamagui.dev/llms.txt |
| その他 | `/llms.txt` を確認 |

---

## 軽量クロール（llms.txtがない場合）

llms.txtがないサイトでは、各ページから**タイトルと概要のみ**を抽出してdocs.md形式のファイルを自動生成する。

### 目的

- 全文クロールは不要
- タイトル + 最初の1-2文だけで十分
- スキル発動時にWeb取得ツールで詳細取得するため

### Web取得ツールプロンプト

```
URL: [URL]
取得・抽出内容: Extract ONLY: 1) The page title 2) The first 1-2 sentences of the main content. Return in format: TITLE: [title] | DESCRIPTION: [description]
```

### 並列取得

利用可能なサブエージェントがある場合は、ページを分担して取得できる。なければ順に取得する:

```
分担例: 以下のURLからタイトルと概要を抽出: [URLリストA]
分担例: 以下のURLからタイトルと概要を抽出: [URLリストB]
```

### カテゴリ分け

URLパターンで自動分類:

| パターン | カテゴリ |
|----------|----------|
| `/getting-started`, `/quickstart`, `/intro` | Getting Started |
| `/installation`, `/setup` | Getting Started |
| `/api`, `/reference` | API Reference |
| `/concepts`, `/fundamentals` | Core Concepts |
| `/guides`, `/how-to` | Guides |
| `/examples`, `/tutorials` | Examples |
| `/advanced`, `/configuration` | Optional |

---

## Web取得ツールによるドキュメント取得

取得方法と結果の形式はクライアントによって異なる。以下はツールに渡す取得・抽出内容の例であり、特定のAPI名や引数を要求しない。

### 基本的な使い方

```
URL: https://example.com/docs/getting-started
取得・抽出内容: Extract the main documentation content. Include all code blocks, API definitions, and usage examples. Exclude navigation, footer, and advertisements.
```

### プロンプトの書き方

**汎用プロンプト:**
```
Extract the main documentation content from this page.
Include:
- All code blocks with language tags
- API definitions and type information
- Usage examples
- Warnings and notes

Exclude:
- Navigation menus
- Footer content
- Advertisements
```

**API リファレンス向け:**
```
Extract API documentation. For each API:
- Function/method signature
- Parameters with types and descriptions
- Return value type and description
- Code examples
```

**軽量クロール向け（タイトル+概要のみ）:**
```
Extract ONLY:
1) The page title
2) The first 1-2 sentences of the main content

Return in format: TITLE: [title] | DESCRIPTION: [description]
```

### Web取得ツールの特性

**メリット:**
- HTML→Markdown変換が自動で行われる
- コンテキスト消費が少ない
- raw/ディレクトリの管理が不要

**制限事項:**
- 非常に長いページは要約される可能性がある
- JavaScript実行不可（SPAは困難）
- 認証が必要なページは取得困難

---

## URL収集テクニック

### 1. サイトマップ確認

多くのドキュメントサイトはsitemap.xmlを提供:

```bash
curl -fLsS https://example.com/sitemap.xml -o sitemap.xml
# Readツールで読み取り、/docs/または/api/を含むURLを抽出
```

### 2. ナビゲーション解析

サイトマップがない場合:

```
URL: https://example.com/docs
取得・抽出内容: Extract all documentation page URLs from the navigation/sidebar. Return as a list of URLs.
```

### 3. 重要ページの特定

一般的なドキュメント構造:

| パターン | 内容 |
|----------|------|
| `/docs/getting-started` | 導入ガイド |
| `/docs/api/*` | APIリファレンス |
| `/docs/guides/*` | 使い方ガイド |
| `/docs/examples/*` | サンプルコード |

---

## エラーハンドリング

### 404エラー
- URLパターンを変えて再試行
- 代替ドキュメントソースを検討

### タイムアウト
- ページが重い場合は特定セクションのみ取得

### リダイレクト
- `curl -L` オプションでリダイレクトを自動追跡

---

## 生成されるファイルの品質チェック

- [ ] docs.md形式（タイトル + URL + 概要）になっている
- [ ] URLが実際にアクセス可能
- [ ] カテゴリ分けが適切
- [ ] 重複エントリがない
