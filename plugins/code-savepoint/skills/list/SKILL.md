---
name: savepoint-list
description: セーブポイント一覧を表示
allowed-tools: Bash
---

# List Command

作成されたセーブポイントの一覧を要約付きで表示します。

## 使用方法

```bash
${CLAUDE_PLUGIN_ROOT}/skills/list/scripts/list.sh
```

## 出力例

```
セーブポイント一覧:

  [sp-20250126-153045] 2025-01-26
    Changed: src/index.ts, src/utils.ts

  [sp-20250126-142010] 2025-01-26
    Initial savepoint
```

## 注意事項

- セーブポイントリポジトリは `~/.claude/savepoint-repos/` に保存されます
- 要約はセーブポイント作成時に自動生成されます
