# 884js-agent-plugins

Codex・Claude Codeで同じスキルを使うためのマーケットプレイスです。開発に関するスキルを `development` プラグインにまとめ、今後も追加していきます。両クライアントで同じ `skills/` を読み込みます。

## スキル

| スキル | 用途 |
| --- | --- |
| [technology-selection](plugins/development/skills/technology-selection/SKILL.md) | 公式提供・人気・保守・権限・外部送信を確認して技術を選ぶ |
| [naming](plugins/development/skills/naming/SKILL.md) | プロダクト・リポジトリ・プラグイン・スキルの名前を提案・比較・見直す |
| [check-docs](plugins/development/skills/check-docs/SKILL.md) | ステージ済みの変更に関連するドキュメントの更新漏れを確認・修正する |
| [browser-check](plugins/development/skills/browser-check/SKILL.md) | 日常のブラウザ確認を変更箇所と合格条件に絞り、重複確認を減らす |
| [working-style](plugins/development/skills/working-style/SKILL.md) | 作業の進め方と、説明・文章修正の伝え方を適用する |
| [pr-comment](plugins/development/skills/pr-comment/SKILL.md) | PRのレビュー指摘・返信・実装や検証結果のコメントを整える |
| [writing-style](plugins/development/skills/writing-style/SKILL.md) | 本人名義の文章を、相手に合った自然な日本語に整える |

開発の計画・実装・技術選定・命名・ドキュメントの更新確認・ブラウザ確認などの依頼時に、説明文に基づいて該当するスキルが選ばれます。明示的に使う場合は、Codexでは `$development:<スキル名>`、Claude Codeでは `/development:<スキル名>` を指定します。例: `$development:browser-check` / `/development:browser-check`。

`naming` は、役割が伝わるか、覚えやすいか、呼び出し名として使いやすいかを比べ、用途に応じて重複を確認します。変数・関数・クラス名の整理は対象外です。名前の提案だけでファイルや公開識別子を変更しません。

`check-docs` は、既定ではステージ済みの差分を対象に、判定用の別エージェント1体が関連ドキュメントを確認します。親エージェントは要確認の箇所だけ追加調査し、更新まで依頼されている場合は必要な箇所を修正します。差分がなければ別エージェントを起動せず、委譲機能が使えない場合は親が判定します。モデルの固定や自動実行フックの追加は行いません。

`browser-check` は、日常の変更確認で合格条件を必要最小限にし、確認できたら終了します。修正後は原則として直した箇所だけを再確認し、成功済みの項目や周辺機能まで確認し直しません。追加確認は具体的な不具合の疑いがある箇所に限ります。ブラウザ操作ツールの必須手順やプロジェクトの必須チェックは維持し、総合QAの代替にはしません。追加のブラウザツールは同梱しません。

`working-style` は、合意の引き継ぎ・最小限の変更・情報の確認・図解・修正後の全文提示など、進め方と伝え方をまとめています。`description` による自動選択は、毎回の起動を保証するものではありません。

`pr-comment` はレビュー指摘に `[MUST]`・`[IMO]`・`[NITS]`・`[Q]` を使い、返信・報告には付けません。リポジトリの表記指定を優先し、投稿・編集は明示的に依頼された場合だけ行います。

`writing-style` は本人名義のSlack・PRコメント・Notion・メールなどの文体に適用します。AIの通常の返答には適用せず、PRのラベルや返信形式はそれぞれのスキルに任せます。

## Codex

```bash
codex plugin marketplace add 884js/agent-plugins --ref main
codex plugin add development@884js-agent-plugins
codex plugin list --available --json
```

インストール後は新しいセッションを開始してください。

## Claude Code

Claude Code内で実行します。

```text
/plugin marketplace add 884js/agent-plugins
/plugin install development@884js-agent-plugins
```

全プロジェクトで使う場合はUserスコープを選択してください。インストール後は新しいセッションを開始します。

## 更新

プラグイン・マーケットプレイスのどちらにも `version` を記載せず、タグやリリース番号を管理しません。更新は `main` のGitコミットを基準に取り込みます。

- **Codex**: プラグインが有効な場合、起動時にGitマーケットプレイスを更新し、インストール済みキャッシュを再取得します。手動更新は `codex plugin marketplace upgrade 884js-agent-plugins` です。
- **Claude Code**: 第三者マーケットプレイスの自動更新は既定で無効です。`/plugin` → Marketplaces → `884js-agent-plugins` → Enable auto-updateを有効にしてください。手動更新は `/plugin marketplace update 884js-agent-plugins` と `/plugin update development@884js-agent-plugins` です。
- 更新後の内容は新しいセッションで確認してください。versionを省略しても、未更新のキャッシュや進行中の会話が即時に切り替わるわけではありません。

根拠: [Codexの起動時更新](https://github.com/openai/codex/blob/rust-v0.142.5/codex-rs/core-plugins/src/manager.rs#L1837-L1889)、[Claude Codeのversion判定](https://code.claude.com/docs/en/plugins/loading#how-claude-code-computes-the-version)、[Claude Codeの自動更新](https://code.claude.com/docs/en/plugins/host-marketplace#turn-on-auto-update)。

## 権限とデータ

このプラグインはMCPサーバー、自動実行フック、インストール処理、独自の利用計測を登録しません。スキルの調査時には、利用中のクライアントの検索・閲覧・ファイル操作ツールを使用します。クライアント自身の通信・計測設定は変更しません。

## 開発

共通manifestは `.claude-plugin/marketplace.json` と `plugins/development/.claude-plugin/plugin.json` にあります。CodexはClaude互換manifestを読み込めるため、定義を二重管理しません。

```bash
claude plugin validate .
claude plugin validate ./plugins/development
```

ローカル検証では、普段の設定と分けた `CODEX_HOME` / `CLAUDE_CONFIG_DIR` を使い、このリポジトリの絶対パスをマーケットプレイスとして追加してください。認証情報をコピーする必要はありません。

## ライセンス

MIT
