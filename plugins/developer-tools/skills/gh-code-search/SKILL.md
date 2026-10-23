---
name: gh-code-search
description: |
  GitHub リポジトリからコードを検索し、関連するコードの実装を取得するスキル。
  別リポジトリのコードコンテキストが必要な場合に使用。
  以下の場面で使用:
  - APIエンドポイントの実装を確認したい時
  - リクエスト/レスポンスの型定義を探したい時
  - 関連するバックエンドコードを検索したい時
  - フロントエンドのコンポーネント実装を確認したい時
  - テストコードを検索したい時
  「バックエンド検索」「フロントエンド検索」「API実装確認」「コード検索」「gh search」などでも呼び出し可能。
---

# gh-code-search スキル

GitHub リポジトリからコードを検索し、関連するコードの実装コンテキストを取得するためのスキル。
フロントエンド→バックエンド、バックエンド→フロントエンドの双方向検索に対応。

## 前提条件

- `gh` CLI と `jq` がインストール済みであること
- `gh auth login` で認証済みであること
- 検索対象リポジトリへの読み取り権限があること

`{skill_dir}` は、このSKILL.mdが置かれているディレクトリの絶対パスに置き換える。プラグインのキャッシュやカレントディレクトリを仮定しない。GitHubへの通信は利用環境の権限ルールに従う。

## 基本的な使い方

### 1. 認証状態確認

```bash
gh auth status
```

### 2. コード検索

#### 方法A: search_code.sh スクリプト使用

```bash
bash "{skill_dir}/scripts/search_code.sh" <owner/repo> "<検索クエリ>" [オプション]

# オプション:
#   --language <lang>    言語でフィルタ (例: go, typescript, python)
#   --path <path>        パスでフィルタ
#   --show-content       ファイル内容も表示
#   --limit <n>          結果数制限 (default: 10)
#   --branch <branch>    ブランチ指定 (default: リポジトリのデフォルトブランチ)
```

#### 方法B: gh コマンド直接使用

```bash
# 基本検索（言語指定なし）
gh search code "<クエリ>" --repo owner/repo

# 言語を指定して検索
gh search code "<クエリ>" --repo owner/repo --language go
gh search code "<クエリ>" --repo owner/repo --language typescript

# ファイル内容取得
gh api "repos/owner/repo/contents/path/to/file" --jq '.content' | base64 -d
```

## 検索パターン例

### キーワード検索

```bash
# 単純なキーワード検索
bash "{skill_dir}/scripts/search_code.sh" myorg/repo "UserService"

# パス絞り込み
bash "{skill_dir}/scripts/search_code.sh" myorg/repo "handler" --path src/api
```

### 関数・クラス定義検索

```bash
# 関数定義（言語非依存）
bash "{skill_dir}/scripts/search_code.sh" myorg/repo "function createUser"
bash "{skill_dir}/scripts/search_code.sh" myorg/repo "func.*Handler"
bash "{skill_dir}/scripts/search_code.sh" myorg/repo "def create_user"

# クラス・型定義
bash "{skill_dir}/scripts/search_code.sh" myorg/repo "class UserService"
bash "{skill_dir}/scripts/search_code.sh" myorg/repo "interface User"
bash "{skill_dir}/scripts/search_code.sh" myorg/repo "type User struct"
```

## ユースケース

### FE→BE: バックエンドAPI実装確認

フロントエンドからバックエンドのAPI実装を調べる場合：

```bash
# エンドポイント検索 (Go/Echo)
bash "{skill_dir}/scripts/search_code.sh" myorg/backend "e.POST" --language go --path internal/handler

# エンドポイント検索 (Python/FastAPI)
bash "{skill_dir}/scripts/search_code.sh" myorg/backend "@app.post" --language python

# 型定義検索
bash "{skill_dir}/scripts/search_code.sh" myorg/backend "type.*Request struct" --language go --show-content
```

### BE→FE: フロントエンド利用箇所確認

バックエンドからフロントエンドでの利用状況を調べる場合：

```bash
# API呼び出し箇所検索
bash "{skill_dir}/scripts/search_code.sh" myorg/frontend "/api/v1/users" --language typescript

# コンポーネント検索
bash "{skill_dir}/scripts/search_code.sh" myorg/frontend "UserList" --path src/components --show-content

# フック・ユーティリティ検索
bash "{skill_dir}/scripts/search_code.sh" myorg/frontend "useUser" --language typescript
```

### 言語別パターン

#### Go

```bash
# ハンドラー関数
gh search code "func.*Handler" --repo owner/repo --language go

# 構造体定義
gh search code "type User struct" --repo owner/repo --language go
```

#### TypeScript / JavaScript

```bash
# React コンポーネント
gh search code "export.*function.*Component" --repo owner/repo --language typescript

# API クライアント
gh search code "fetch.*api" --repo owner/repo --language typescript
```

#### Python

```bash
# FastAPI エンドポイント
gh search code "@app.get|@app.post" --repo owner/repo --language python

# クラス定義
gh search code "class.*Service" --repo owner/repo --language python
```

## ファイル内容の取得

検索で見つかったファイルの全体を取得する場合：

```bash
# ファイル内容を取得してデコード
gh api "repos/owner/repo/contents/path/to/file" --jq '.content' | base64 -d

# 特定ブランチのファイル
gh api "repos/owner/repo/contents/path/to/file?ref=develop" --jq '.content' | base64 -d
```

## トラブルシューティング

### 認証エラー

```bash
# 再認証
gh auth login

# 認証状態確認
gh auth status
```

### 検索結果が少ない場合

- クエリを簡略化する
- 言語フィルタを外す（`--language` オプションを省略）
- パスフィルタを広げる

### rate limit エラー

```bash
# rate limit 確認
gh api rate_limit
```

少し待ってから再実行してください。
