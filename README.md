# agent-plugins

Codex・Claude Codeで同じスキルを使うためのマーケットプレイスです。`developer-tools` プラグインをインストールすると、両クライアントで同じ `skills/` を読み込みます。

## スキル

| スキル | 用途 |
| --- | --- |
| [technology-selection](plugins/developer-tools/skills/technology-selection/SKILL.md) | 公式提供・人気・保守・権限・外部送信を確認して技術を選ぶ |
| [qa-level-assessment](plugins/developer-tools/skills/qa-level-assessment/SKILL.md) | 変更リスクからQAレベルと確認体制を提案する |
| [gh-code-search](plugins/developer-tools/skills/gh-code-search/SKILL.md) | GitHub上の別リポジトリからコードを検索する |
| [best-practices-reviewer](plugins/developer-tools/skills/best-practices-reviewer/SKILL.md) | プロジェクトの規約・既存実装・検証方法に沿ってレビューする |
| [index-lib-docs](plugins/developer-tools/skills/index-lib-docs/SKILL.md) | プロジェクトの依存関係からドキュメント参照スキルを生成する（明示呼び出し） |
| [lib-docs-generator](plugins/developer-tools/skills/lib-docs-generator/SKILL.md) | ライブラリのドキュメントURLから参照スキルを生成する（明示呼び出し） |
| [github-activity-report](plugins/developer-tools/skills/github-activity-report/SKILL.md) | GitHubの活動をローカルのMarkdownレポートにまとめる |

技術選定の相談やライブラリ・MCPなどの導入時に、説明文に基づいてスキルが選ばれます。明示的に使う場合は、Codexでは `$developer-tools:technology-selection`、Claude Codeでは `/developer-tools:technology-selection` を指定します。

ほかのスキルも同じ形式で呼び出せます。`index-lib-docs` と `lib-docs-generator` は元の方針を維持し、明示呼び出し限定です。Claude Code用の `disable-model-invocation` とCodex用の `agents/openai.yaml` で制御しています。

既存6スキルは [884js/agent-skills](https://github.com/884js/agent-skills/tree/main/skills) から統合しました。古い `skill-creator` と生成済みの業務データは含めません。元のリポジトリは変更せず、今後の共通プラグインの更新はこのリポジトリで行います。以前のスキルも個別に導入している場合は重複するため、旧配置を確認してから切り替えてください。

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

- GitHubを使うスクリプトには、認証済みの `gh`、対象への読み取り権限、`jq`、Bashが必要です。
- ドキュメント調査では公式サイト・公開レジストリへアクセスします。非公開のパッケージ名は外部検索へ送らず、許可された内部資料を使います。
- 活動レポートは非公開PRの情報を含む場合があります。出力先はプラグインの外に置き、外部共有前に内容を確認してください。

## 開発

共通manifestは `.claude-plugin/marketplace.json` と `plugins/developer-tools/.claude-plugin/plugin.json` にあります。CodexはClaude互換manifestを読み込めるため、定義を二重管理しません。

```bash
claude plugin validate .
claude plugin validate ./plugins/developer-tools
bash plugins/developer-tools/skills/github-activity-report/tests/test_fetch_pr_details.sh
bash plugins/developer-tools/skills/github-activity-report/tests/test_generate_report.sh
```

ローカル検証では、普段の設定と分けた `CODEX_HOME` / `CLAUDE_CONFIG_DIR` を使い、このリポジトリの絶対パスをマーケットプレイスとして追加してください。認証情報をコピーする必要はありません。

## ライセンス

MIT
