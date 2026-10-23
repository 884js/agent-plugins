# docs.md生成テンプレート

llms.txtがないサイトからスキルを生成する際に、このテンプレートを参照して`docs.md`を生成する。

## テンプレート

```markdown
# [LIBRARY_NAME]

> [DESCRIPTION - ライブラリの概要を1-2文で]

## Getting Started

### [PAGE_TITLE]
- **URL**: [FULL_URL]
- **概要**: [1-2文での説明]
- **手順**:
  - [主要なステップ1]
  - [主要なステップ2]
- **コード例**:
  ```[language]
  [インポート文]
  [基本的な使用例]
  ```

## Core Concepts

### [PAGE_TITLE]
- **URL**: [FULL_URL]
- **概要**: [1-2文での説明]
- **主要ポイント**:
  - [ポイント1]
  - [ポイント2]
- **コード例**:
  ```[language]
  [コード例]
  ```

## API Reference

### [FUNCTION_OR_COMPONENT_NAME]
- **URL**: [FULL_URL]
- **概要**: [1-2文での説明]
- **シグネチャ**: `[関数名(パラメータ): 戻り値]`
- **主要パラメータ**:
  - `[param1]: [type]` - [説明]
  - `[param2]: [type]` - [説明]
- **コード例**:
  ```[language]
  [使用例]
  ```

## Guides

### [PAGE_TITLE]
- **URL**: [FULL_URL]
- **概要**: [1-2文での説明]
- **主要ポイント**:
  - [ポイント1]
  - [ポイント2]
- **コード例**:
  ```[language]
  [コード例]
  ```

## Examples

### [PAGE_TITLE]
- **URL**: [FULL_URL]
- **概要**: [1-2文での説明]
- **コード例**:
  ```[language]
  [サンプルコード]
  ```

## Optional

### [PAGE_TITLE]
- **URL**: [FULL_URL]
- **概要**: [1-2文での説明]
```

## 記載ルール

### 必須項目

| セクション | 説明 |
|------------|------|
| Library名 | `# {Library}` 形式で記載 |
| Description | `> ` で始まる引用形式。1-2文で概要を説明 |
| Getting Started | インストール・セットアップ関連。コード例必須 |

### 各エントリの必須フィールド

| フィールド | 説明 | 必須 |
|------------|------|------|
| URL | 完全なURL | 必須 |
| 概要 | 1-2文での説明 | 必須 |
| コード例 | 基本的な使用例 | Getting Started・API Referenceは必須 |
| シグネチャ | 関数/コンポーネントの型情報 | API Referenceは必須 |
| 主要パラメータ | パラメータと型の説明 | API Referenceは推奨 |
| 主要ポイント | 重要な内容の箇条書き | Guides・Core Conceptsは推奨 |

### オプションセクション

必要に応じてセクションを追加・省略:

- **Core Concepts**: 基本概念・アーキテクチャ
- **API Reference**: 関数・コンポーネント・フック等
- **Guides**: ハウツーガイド
- **Examples**: サンプルコード
- **Optional**: 高度な設定・トラブルシューティング等

## 品質チェックリスト

生成したdocs.mdが以下を満たすことを確認:

- [ ] **必須セクション**: Library名、Description、Getting Started が含まれている
- [ ] **URL検証**: 全URLがアクセス可能
- [ ] **コード例**: 主要機能（Getting Started、API Reference）にコード例がある
- [ ] **API情報**: API Referenceページにはシグネチャがある
- [ ] **重複なし**: 同じ内容が複数回出現していない
- [ ] **網羅性**: 主要なドキュメントページが含まれている

## 例: TanStack Queryの場合

```markdown
# TanStack Query

> Powerful asynchronous state management for React. Handles fetching, caching, synchronizing and updating server state.

## Getting Started

### Installation
- **URL**: https://tanstack.com/query/latest/docs/react/installation
- **概要**: TanStack Queryのインストール方法
- **手順**:
  - npm install @tanstack/react-query
  - QueryClientProviderでアプリをラップ
- **コード例**:
  ```tsx
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

  const queryClient = new QueryClient()

  function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <YourApp />
      </QueryClientProvider>
    )
  }
  ```

### Quick Start
- **URL**: https://tanstack.com/query/latest/docs/react/quick-start
- **概要**: 基本的なデータ取得の実装方法
- **コード例**:
  ```tsx
  import { useQuery } from '@tanstack/react-query'

  function Todos() {
    const { data, isLoading } = useQuery({
      queryKey: ['todos'],
      queryFn: fetchTodos,
    })
  }
  ```

## API Reference

### useQuery
- **URL**: https://tanstack.com/query/latest/docs/react/reference/useQuery
- **概要**: サーバーからのデータ取得・キャッシュ・再検証を行うフック
- **シグネチャ**: `useQuery(options: UseQueryOptions): UseQueryResult`
- **主要パラメータ**:
  - `queryKey: QueryKey` - クエリの一意識別子
  - `queryFn: QueryFunction` - データ取得関数
  - `staleTime?: number` - データが古くなるまでの時間（ms）
  - `gcTime?: number` - 未使用データがガベージコレクトされるまでの時間（ms）
- **コード例**:
  ```tsx
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // 5分
  })
  ```

### useMutation
- **URL**: https://tanstack.com/query/latest/docs/react/reference/useMutation
- **概要**: サーバーへのデータ更新を行うフック
- **シグネチャ**: `useMutation(options: UseMutationOptions): UseMutationResult`
- **主要パラメータ**:
  - `mutationFn: MutationFunction` - 更新を実行する関数
  - `onSuccess?: (data) => void` - 成功時のコールバック
  - `onError?: (error) => void` - エラー時のコールバック
- **コード例**:
  ```tsx
  const mutation = useMutation({
    mutationFn: (newTodo) => axios.post('/todos', newTodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
  ```

## Guides

### Caching
- **URL**: https://tanstack.com/query/latest/docs/react/guides/caching
- **概要**: TanStack Queryのキャッシュ戦略と設定方法
- **主要ポイント**:
  - staleTimeでデータの鮮度を制御
  - gcTimeで未使用キャッシュの保持期間を設定
  - queryClient.invalidateQueriesでキャッシュを無効化
- **コード例**:
  ```tsx
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5分
        gcTime: 1000 * 60 * 30, // 30分
      },
    },
  })
  ```
```

## 生成時の注意点

1. **URLは実際にアクセス可能なものを使用**
2. **コード例はページから実際に抽出した内容を使う**
3. **シグネチャは正確な型情報を記載**
4. **セクション名は実際のドキュメント構造に合わせて調整可能**
5. **不要なセクションは省略してよい**
6. **コードブロックの言語指定を正確に（tsx, ts, js, bash等）**
