# /savepoint:cleanup

現在のプロジェクトのセーブポイントを手動でクリーンアップします。

## 使用方法

```bash
/savepoint:cleanup
```

## 実行手順

1. 以下のスクリプトを実行してセーブポイントを削除します：

```bash
bun "${CLAUDE_PLUGIN_ROOT}/skills/cleanup/scripts/cleanup.ts"
```

2. 実行結果をユーザーに報告してください。
