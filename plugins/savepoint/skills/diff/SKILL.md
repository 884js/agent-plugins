---
name: savepoint-diff
description: セーブポイントとの差分を表示
allowed-tools: Bash
argument-hint: "[savepoint1] [savepoint2]"
---

# Diff Command

現在の状態と指定したセーブポイント（またはセーブポイント間）の差分を表示します。

## 使用方法

```bash
# 最新セーブポイントからの変更
"$HOME/.bun/bin/bun" "${CLAUDE_PLUGIN_ROOT}/skills/diff/scripts/diff.ts"

# 指定セーブポイントからの変更
"$HOME/.bun/bin/bun" "${CLAUDE_PLUGIN_ROOT}/skills/diff/scripts/diff.ts" 20250126-153045

# 2つのセーブポイント間の差分
"$HOME/.bun/bin/bun" "${CLAUDE_PLUGIN_ROOT}/skills/diff/scripts/diff.ts" 20250126-142010 20250126-153045
```

## 引数

- 引数なし: 最新セーブポイントから現在までの変更
- 1つ: 指定セーブポイントから現在までの変更
- 2つ: 2つのセーブポイント間の変更

## 出力例

```
変更されたファイル (savepoint/20250126-153045 → 現在):
M  src/utils.ts
A  src/new-feature.ts

diff --git a/src/utils.ts b/src/utils.ts
...
```

## 注意事項

- 差分表示にはGitのdiffフォーマットを使用します
- バイナリファイルの差分は表示されません
