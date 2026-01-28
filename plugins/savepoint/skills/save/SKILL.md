---
name: savepoint-save
description: 手動でセーブポイントを作成
allowed-tools: Bash
---

# Save Command

現在の状態でセーブポイントを手動作成します。

## 使用方法

```bash
"$HOME/.bun/bin/bun" "${CLAUDE_PLUGIN_ROOT}/skills/save/scripts/create.ts"
```

## 動作

1. プロジェクトファイルをセーブポイントリポジトリに同期
2. 変更がある場合のみセーブポイント（タグ）を作成
3. 前のセーブポイントとのdiffを保存

## 出力

- 成功時: セーブポイント名を表示
- 変更なし: 何も作成されない旨を表示

## 注意事項

- git管理されているプロジェクトのみ対応
- `.claude/` 配下のプロジェクトは対象外
- セーブポイントリポジトリは `~/.claude/savepoint-repos/` に保存されます
