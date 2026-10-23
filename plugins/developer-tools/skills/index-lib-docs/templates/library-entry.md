# ライブラリエントリーテンプレート

各ライブラリの `references/{library}.md` ファイルのテンプレート。

## テンプレート

```markdown
# {Library}

> Version: {version}
> Docs: {docs_url}
> llms.txt: {llms_txt_url or "Not available"}

## Overview

{description}

## Documentation Links

### Getting Started
- [Quick Start]({docs_url}/getting-started): 基本的な使い方
- [Installation]({docs_url}/installation): インストール方法

### API Reference
- [API]({docs_url}/api): API一覧

### Guides
- [Guide]({docs_url}/guides): ガイド
```

## プレースホルダー

| プレースホルダー | 説明 | 例 |
|------------------|------|-----|
| `{Library}` | ライブラリの表示名 | `React`, `TanStack Query` |
| `{version}` | 使用バージョン | `18.2.0` |
| `{docs_url}` | ドキュメントURL | `https://react.dev` |
| `{llms_txt_url}` | llms.txt URL（あれば） | `https://react.dev/llms.txt` |
| `{description}` | ライブラリの説明 | npm/PyPIから取得 |

---

## 生成ルール

### ファイル名

パッケージ名からファイル名を生成:

| パッケージ名 | ファイル名 |
|--------------|------------|
| `react` | `react.md` |
| `@tanstack/react-query` | `tanstack-react-query.md` |
| `@types/node` | `types-node.md` |
| `next` | `next.md` |

```bash
# 変換ロジック
normalize_package_name() {
  echo "$1" | sed 's/@//g' | sed 's/\//-/g'
}
```

### llms.txt が存在する場合

llms.txt がある場合は、Documentation Links セクションを簡略化:

```markdown
# TanStack Query

> Version: 5.62.0
> Docs: https://tanstack.com/query/latest
> llms.txt: https://tanstack.com/query/latest/llms.txt

## Overview

Powerful asynchronous state management for TS/JS, React, Solid, Vue, Svelte and Angular.

## Documentation

llms.txt が利用可能です。詳細なドキュメントは以下から取得してください:

```bash
curl -fLsS https://tanstack.com/query/latest/llms.txt
```
```

### llms.txt が存在しない場合

主要なドキュメントリンクを含める:

```markdown
# React

> Version: 18.2.0
> Docs: https://react.dev
> llms.txt: Not available

## Overview

A JavaScript library for building user interfaces.

## Documentation Links

### Getting Started
- [Quick Start](https://react.dev/learn): Reactの基本を学ぶ
- [Installation](https://react.dev/learn/installation): インストール方法

### Core Concepts
- [Thinking in React](https://react.dev/learn/thinking-in-react): Reactの考え方
- [Describing the UI](https://react.dev/learn/describing-the-ui): UIの記述方法

### API Reference
- [Hooks](https://react.dev/reference/react): フック一覧
- [Components](https://react.dev/reference/react-dom/components): コンポーネント一覧

### Guides
- [Managing State](https://react.dev/learn/managing-state): 状態管理
- [Escape Hatches](https://react.dev/learn/escape-hatches): 高度なパターン
```

---

## ドキュメントリンク収集方法

### 1. llms.txt から取得

llms.txt がある場合、そこからリンクを抽出:

```bash
curl -fLsS https://example.com/llms.txt | grep -E '^\[.+\]\(.+\)' | head -20
```

### 2. Web取得ツール でナビゲーション解析

```
URL: {docs_url}
取得・抽出内容: Extract the main documentation navigation links. Return as markdown links with brief descriptions.
```

### 3. 既知のパターンを使用

多くのドキュメントサイトは以下の構造:

| パス | 内容 |
|------|------|
| `/docs` or `/learn` | Getting Started |
| `/docs/api` or `/reference` | API Reference |
| `/docs/guides` | Guides |
| `/docs/examples` | Examples |

---

## 生成例

### React (llms.txtなし)

```markdown
# React

> Version: 18.2.0
> Docs: https://react.dev
> llms.txt: Not available

## Overview

React is a JavaScript library for building user interfaces.

## Documentation Links

### Getting Started
- [Quick Start](https://react.dev/learn): Reactの基本を学ぶ
- [Installation](https://react.dev/learn/installation): インストール方法
- [Tutorial](https://react.dev/learn/tutorial-tic-tac-toe): チュートリアル

### Core Concepts
- [Describing the UI](https://react.dev/learn/describing-the-ui): UIの記述方法
- [Adding Interactivity](https://react.dev/learn/adding-interactivity): インタラクティブ性の追加
- [Managing State](https://react.dev/learn/managing-state): 状態管理

### API Reference
- [Hooks](https://react.dev/reference/react): useState, useEffect等
- [Components](https://react.dev/reference/react-dom/components): DOM components
- [APIs](https://react.dev/reference/react/apis): createContext等
```

### TanStack Query (llms.txtあり)

```markdown
# TanStack Query

> Version: 5.62.0
> Docs: https://tanstack.com/query/latest
> llms.txt: https://tanstack.com/query/latest/llms.txt

## Overview

Powerful asynchronous state management for TS/JS, React, Solid, Vue, Svelte and Angular.

## Documentation

llms.txt が利用可能です。詳細なドキュメントは以下から取得してください:

```bash
curl -fLsS https://tanstack.com/query/latest/llms.txt
```

## Quick Links

- [Overview](https://tanstack.com/query/latest/docs/framework/react/overview): 概要
- [Quick Start](https://tanstack.com/query/latest/docs/framework/react/quick-start): クイックスタート
- [useQuery](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery): データ取得
- [useMutation](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation): データ更新
```

### Zod (llms.txtなし)

```markdown
# Zod

> Version: 3.22.0
> Docs: https://zod.dev
> llms.txt: Not available

## Overview

TypeScript-first schema validation with static type inference.

## Documentation Links

### Getting Started
- [Introduction](https://zod.dev/?id=introduction): Zodの概要
- [Installation](https://zod.dev/?id=installation): インストール

### API Reference
- [Primitives](https://zod.dev/?id=primitives): 基本型
- [Objects](https://zod.dev/?id=objects): オブジェクトスキーマ
- [Arrays](https://zod.dev/?id=arrays): 配列スキーマ
- [Unions](https://zod.dev/?id=unions): ユニオン型

### Advanced
- [Error Handling](https://zod.dev/?id=error-handling): エラーハンドリング
- [Type Inference](https://zod.dev/?id=type-inference): 型推論
```
