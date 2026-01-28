---
name: savepoint-rollback
description: 指定したセーブポイントに戻す
allowed-tools: Bash
disable-model-invocation: true
argument-hint: "[savepoint-name]"
---

# Rollback Command

指定したセーブポイントに戻します。

## 使用方法

```bash
"$HOME/.bun/bin/bun" "${CLAUDE_PLUGIN_ROOT}/skills/rollback/scripts/restore.ts" <savepoint-name>
```

例: `restore.ts 20250126-153045`

## 引数

- `$ARGUMENTS` - 戻したいセーブポイント名（必須）
  - `savepoint/20250126-153045` または `20250126-153045` のどちらでも可

## 動作

1. 指定されたセーブポイントの存在を確認
2. リポジトリを指定セーブポイントにリセット
3. プロジェクトファイルを復元

## 注意事項

- セーブポイント名は `/savepoint:list` で確認できます
- 復元操作自体では新しいセーブポイントは作成されません
