---
name: savepoint-reject
description: AIの変更を破棄して直前のセーブポイントに戻す。「元に戻して」「やり直して」「変更を取り消して」などで使用。
allowed-tools: Bash
disable-model-invocation: true
---

# Reject Command

AIが行った変更を破棄し、直前のセーブポイントまで戻します。

## 使用方法

```bash
${CLAUDE_PLUGIN_ROOT}/skills/reject/scripts/reject.sh
```

## 動作

1. 直前のセーブポイントを特定
2. それより新しいセーブポイントを削除
3. リポジトリを直前のセーブポイントにリセット
4. プロジェクトファイルを復元

## 注意事項

- 復元すると、そのセーブポイント以降の履歴は削除されます
- 復元操作自体では新しいセーブポイントは作成されません
