# agent-plugins

Codex・Claude Codeで同じスキルを使うためのマーケットプレイスです。`developer-tools` プラグインをインストールすると、両クライアントで同じ `skills/` を読み込みます。

## スキル

| スキル | 用途 |
| --- | --- |
| [technology-selection](plugins/developer-tools/skills/technology-selection/SKILL.md) | 公式提供・人気・保守・権限・外部送信を確認して技術を選ぶ |
| [naming](plugins/developer-tools/skills/naming/SKILL.md) | プロダクト・リポジトリ・プラグイン・スキルの名前を提案・比較・見直す |

技術選定や命名の相談時に、説明文に基づいて該当するスキルが選ばれます。明示的に使う場合は、Codexでは `$developer-tools:technology-selection` / `$developer-tools:naming`、Claude Codeでは `/developer-tools:technology-selection` / `/developer-tools:naming` を指定します。

`naming` は、役割が伝わるか、覚えやすいか、呼び出し名として使いやすいかを比べ、用途に応じて重複を確認します。変数・関数・クラス名の整理は対象外です。名前の提案だけでファイルや公開識別子を変更しません。

## Codex

```bash
codex plugin marketplace add 884js/agent-plugins --ref main
codex plugin add developer-tools@agent-plugins
codex plugin list --available --json
```

インストール後は新しいセッションを開始してください。

## Claude Code

Claude Code内で実行します。

```text
/plugin marketplace add 884js/agent-plugins
/plugin install developer-tools@agent-plugins
```

全プロジェクトで使う場合はUserスコープを選択してください。インストール後は新しいセッションを開始します。

## 更新

プラグイン・マーケットプレイスのどちらにも `version` を記載せず、タグやリリース番号を管理しません。更新は `main` のGitコミットを基準に取り込みます。

- **Codex**: プラグインが有効な場合、起動時にGitマーケットプレイスを更新し、インストール済みキャッシュを再取得します。手動更新は `codex plugin marketplace upgrade agent-plugins` です。
- **Claude Code**: 第三者マーケットプレイスの自動更新は既定で無効です。`/plugin` → Marketplaces → `agent-plugins` → Enable auto-updateを有効にしてください。手動更新は `/plugin marketplace update agent-plugins` と `/plugin update developer-tools@agent-plugins` です。
- 更新後の内容は新しいセッションで確認してください。versionを省略しても、未更新のキャッシュや進行中の会話が即時に切り替わるわけではありません。

根拠: [Codexの起動時更新](https://github.com/openai/codex/blob/rust-v0.142.5/codex-rs/core-plugins/src/manager.rs#L1837-L1889)、[Claude Codeのversion判定](https://code.claude.com/docs/en/plugins/loading#how-claude-code-computes-the-version)、[Claude Codeの自動更新](https://code.claude.com/docs/en/plugins/host-marketplace#turn-on-auto-update)。

## savepointからの移行

savepointとその自動フック・依存パッケージは削除しました。既存環境にインストール済みの場合、マーケットプレイスから消えるだけではアンインストールされません。各クライアントの一覧で名前を確認し、不要なsavepointをアンインストールしてください。その後 `developer-tools@agent-plugins` をインストールします。

## 権限とデータ

このプラグインはMCPサーバー、自動実行フック、インストール処理、独自の利用計測を登録しません。スキルの調査時には、利用中のクライアントの検索・閲覧・ファイル操作ツールを使用します。クライアント自身の通信・計測設定は変更しません。

## 開発

共通manifestは `.claude-plugin/marketplace.json` と `plugins/developer-tools/.claude-plugin/plugin.json` にあります。CodexはClaude互換manifestを読み込めるため、定義を二重管理しません。

```bash
claude plugin validate .
claude plugin validate ./plugins/developer-tools
```

ローカル検証では、普段の設定と分けた `CODEX_HOME` / `CLAUDE_CONFIG_DIR` を使い、このリポジトリの絶対パスをマーケットプレイスとして追加してください。認証情報をコピーする必要はありません。

## ライセンス

MIT
