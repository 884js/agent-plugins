# agent-plugins

Claude Code用のプラグインマーケットプレイス。

## インストール方法

### Step 1: マーケットプレイスの追加

```bash
/plugin marketplace add 884js/agent-plugins
```

### Step 2: プラグインのインストール

```bash
/plugin install code-savepoint@agent-plugins
```

または `/plugin` コマンドでUIからDiscoverタブを選択してインストールできます。

### インストールスコープについて

| スコープ | 説明 |
|---------|------|
| **User** | 全プロジェクトで使用（デフォルト） |
| **Project** | リポジトリの全コラボレーター向け（`.claude/settings.json`に追加） |
| **Local** | 自分のみ、このリポジトリでのみ使用 |

## 含まれているプラグイン

| プラグイン | 説明 |
|-----------|------|
| [code-savepoint](./plugins/code-savepoint/) | AI変更前に自動セーブポイントを作成し、`/reject`で戻せるプラグイン |

## 開発者向け情報

### ローカルでのテスト

```bash
claude --plugin-dir ./plugins/code-savepoint
```

## ライセンス

MIT
