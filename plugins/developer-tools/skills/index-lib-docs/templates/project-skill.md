# project-libs SKILL.md テンプレート

index-lib-docsが生成する `project-libs` スキルのSKILL.mdテンプレート。

## テンプレート

```yaml
---
name: project-libs
description: |
  Provides documentation for project dependencies.
  Use when working with code that imports {IMPORT_LIST}.
  Use when the user asks about {LIBRARY_NAMES} or shows code with these library imports.
  Can also be invoked directly with "project-libs", "プロジェクトライブラリ".
---

# Project Libraries Documentation

## Your Task

ユーザーの質問に対して、プロジェクトで使用しているライブラリのドキュメントを調査して回答してください。

**質問:** 現在の依頼に含まれるユーザーの質問

## Instructions

1. **references/ から関連ライブラリの.mdファイルを読む**
   - 質問に関連するライブラリを特定
   - 該当する references/{library}.md を読み込む

2. **ドキュメントを取得**
   - llms.txt URL があれば curl でダウンロード
   - なければ Web取得ツール でドキュメントページを取得

3. **回答を生成**
   - バージョン情報を明記
   - 具体的なコード例を含める
   - 参照したURLを明記

## Available Libraries

{LIBRARY_TABLE}

## References

{REFERENCE_LINKS}
```

## プレースホルダー

| プレースホルダー | 説明 | 例 |
|------------------|------|-----|
| `{IMPORT_LIST}` | importパターンのリスト | `"react", "next", "@tanstack/react-query"` |
| `{LIBRARY_NAMES}` | ライブラリ名のリスト | `React, Next.js, TanStack Query` |
| `{LIBRARY_TABLE}` | ライブラリ一覧テーブル | 下記参照 |
| `{REFERENCE_LINKS}` | リファレンスファイルへのリンク | 下記参照 |

### {LIBRARY_TABLE} の形式

```markdown
| Library | Version | Docs | llms.txt |
|---------|---------|------|----------|
| react | 18.2.0 | [react.dev](https://react.dev) | - |
| next | 14.2.0 | [nextjs.org](https://nextjs.org) | [llms.txt](https://nextjs.org/llms.txt) |
| @tanstack/react-query | 5.62.0 | [tanstack.com](https://tanstack.com/query) | [llms.txt](https://tanstack.com/query/latest/llms.txt) |
```

### {REFERENCE_LINKS} の形式

```markdown
- [react.md](references/react.md) - React v18.2.0
- [next.md](references/next.md) - Next.js v14.2.0
- [tanstack-react-query.md](references/tanstack-react-query.md) - TanStack Query v5.62.0
```

---

## description の書き方

### ルール

- 1024文字以内
- 英語（日本語キーワードは最終行のみ）
- 三人称・動詞で始める
- **全ライブラリのimportパターンを含める**

### トリガー条件

descriptionには以下を含める:

1. **パッケージ名**: `"react"`, `"next"`, `"@tanstack/react-query"`
2. **主要エクスポート**: `"useState"`, `"useQuery"`, `"NextPage"`
3. **ライブラリ名**: `React`, `Next.js`, `TanStack Query`

### 生成ロジック

```javascript
// パッケージリストからdescriptionを生成
function generateDescription(packages) {
  const importList = packages.map(p => `"${p.name}"`).join(', ');
  const libraryNames = packages.map(p => p.displayName).join(', ');

  return `Provides documentation for project dependencies.
Use when working with code that imports ${importList}.
Use when the user asks about ${libraryNames} or shows code with these library imports.
Can also be invoked directly with "project-libs", "プロジェクトライブラリ".`;
}
```

### 文字数制限への対処

ライブラリ数が多くdescriptionが1024文字を超える場合:

1. 主要ライブラリ（dependencies）を優先
2. devDependenciesは省略または代表的なもののみ
3. 「or any of the project dependencies」で包括

```yaml
description: |
  Provides documentation for project dependencies.
  Use when working with code that imports "react", "next", "@tanstack/react-query", or any of the project dependencies.
  Use when the user asks about React, Next.js, or other project libraries.
  Can also be invoked directly with "project-libs", "プロジェクトライブラリ".
```

---

## 生成例

### 小規模プロジェクト（5-10ライブラリ）

```yaml
---
name: project-libs
description: |
  Provides documentation for project dependencies.
  Use when working with code that imports "react", "next", "zod", "@tanstack/react-query", "tailwindcss".
  Use when the user asks about React, Next.js, Zod, TanStack Query, or Tailwind CSS.
  Can also be invoked directly with "project-libs", "プロジェクトライブラリ".
---

# Project Libraries Documentation

## Your Task

ユーザーの質問に対して、プロジェクトで使用しているライブラリのドキュメントを調査して回答してください。

**質問:** 現在の依頼に含まれるユーザーの質問

## Instructions

1. **references/ から関連ライブラリの.mdファイルを読む**
2. **llms.txt があれば curl、なければ Web取得ツール でドキュメント取得**
3. **バージョン情報を明記して回答**

## Available Libraries

| Library | Version | Docs | llms.txt |
|---------|---------|------|----------|
| react | 18.2.0 | [react.dev](https://react.dev) | - |
| next | 14.2.0 | [nextjs.org](https://nextjs.org) | [llms.txt](https://nextjs.org/llms.txt) |
| zod | 3.22.0 | [zod.dev](https://zod.dev) | - |
| @tanstack/react-query | 5.62.0 | [tanstack.com](https://tanstack.com/query) | [llms.txt](https://tanstack.com/query/latest/llms.txt) |
| tailwindcss | 3.4.0 | [tailwindcss.com](https://tailwindcss.com) | - |

## References

- [react.md](references/react.md) - React v18.2.0
- [next.md](references/next.md) - Next.js v14.2.0
- [zod.md](references/zod.md) - Zod v3.22.0
- [tanstack-react-query.md](references/tanstack-react-query.md) - TanStack Query v5.62.0
- [tailwindcss.md](references/tailwindcss.md) - Tailwind CSS v3.4.0
```
