import type { EngineInterface, Register, UiOpenResult } from "claude-code";
import { atom, read, update } from "claude-code";

import type { Checks, IssueItem, PullItem, Review, Snapshot } from "../types";

const PANE = "my-github";
const TITLE = "GitHub";
/** パネルを開くときに希望する幅（文字数）。人がドラッグして決めた幅のほうが優先される */
const PANE_COLUMNS = 40;
const COMMAND = "my-github";
const REFRESH_MS = 5 * 60 * 1000;
const STORE_OWNER = "owner";
const STORE_COMPACT = "compact";
/** コンパクト表示で、札を置く列の幅（セル数） */
const CHIP_CELLS = 7;
/** PR や issue を作る・状態を変える Bash のあとに、一覧を取り直す */
const TOUCHES_GITHUB =
  /\bgh\s+(pr|issue)\s+(create|ready|close|reopen|merge|edit)\b/;

const EMPTY: Snapshot = {
  prs: [],
  issues: [],
  prTotal: 0,
  issueTotal: 0,
  fetchedAt: null,
  error: null,
  isLoading: false
};

// 項目を変えたら shape の札も変える（読み込み直しても前の値が残るため）
const snapshot = atom(
  { plugin: "my-github", key: "snapshot" } as const,
  EMPTY,
  {
    shape: "snapshot-1"
  }
);
const owner = atom({ plugin: "my-github", key: "owner" } as const, "");
const isCompact = atom(
  { plugin: "my-github", key: "isCompact" } as const,
  false
);
// パネルを開け閉めするたびに増やし、入力欄の上の帯を描き直させる
const paneTick = atom({ plugin: "my-github", key: "paneTick" } as const, 0);

const QUERY = `query($prQuery: String!, $issueQuery: String!) {
  prs: search(query: $prQuery, type: ISSUE, first: 100) {
    issueCount
    nodes { ... on PullRequest { number title url isDraft reviewDecision updatedAt
      repository { nameWithOwner }
      commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } } }
  }
  issues: search(query: $issueQuery, type: ISSUE, first: 100) {
    issueCount
    nodes { ... on Issue { number title url updatedAt
      repository { nameWithOwner }
      assignees(first: 5) { nodes { login } } } }
  }
}`;

type RawPull = {
  number?: number;
  title: string;
  url: string;
  isDraft: boolean;
  reviewDecision: Review;
  updatedAt: string;
  repository: { nameWithOwner: string };
  commits: {
    nodes: { commit: { statusCheckRollup: { state: Checks } | null } }[];
  };
};

type RawIssue = {
  number?: number;
  title: string;
  url: string;
  updatedAt: string;
  repository: { nameWithOwner: string };
  assignees: { nodes: { login: string }[] };
};

type RawResponse = {
  data?: {
    prs: { issueCount: number; nodes: RawPull[] };
    issues: { issueCount: number; nodes: RawIssue[] };
  };
  errors?: { message: string }[];
};

let inflight: Promise<void> | undefined;

/** 取り直しが重ならないよう、走っている間は同じ Promise を返す */
function refresh($: EngineInterface): Promise<void> {
  inflight ??= load($).finally(() => {
    inflight = undefined;
  });

  return inflight;
}

async function load($: EngineInterface): Promise<void> {
  await update($, snapshot, s => ({ ...s, isLoading: true }));
  try {
    const ran = await $.process.run(
      [
        "gh",
        "api",
        "graphql",
        "-f",
        `query=${QUERY}`,
        "-f",
        "prQuery=is:pr is:open author:@me archived:false sort:updated-desc",
        "-f",
        "issueQuery=is:issue is:open author:@me archived:false sort:updated-desc"
      ],
      { timeoutMs: 60_000 }
    );
    if (ran.exitCode !== 0) {
      const reason =
        firstLine(ran.stderr) ||
        `gh が終了コード ${ran.exitCode} で止まりました`;
      await update($, snapshot, s => ({
        ...s,
        error: reason,
        isLoading: false
      }));

      return;
    }
    const body = JSON.parse(ran.stdout) as RawResponse;
    if (!body.data) {
      const reason =
        body.errors?.[0]?.message ?? "GitHub の応答に data がありません";
      await update($, snapshot, s => ({
        ...s,
        error: reason,
        isLoading: false
      }));

      return;
    }
    const prs = body.data.prs.nodes.filter(isPull).map(toPull);
    const issues = body.data.issues.nodes.filter(isIssue).map(toIssue);
    const now = await $.clock.now();
    await update($, snapshot, () => ({
      prs,
      issues,
      prTotal: body.data?.prs.issueCount ?? prs.length,
      issueTotal: body.data?.issues.issueCount ?? issues.length,
      fetchedAt: new Date(now).toISOString(),
      error: null,
      isLoading: false
    }));
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    await update($, snapshot, s => ({ ...s, error: reason, isLoading: false }));
  }
}

function isPull(node: RawPull): node is RawPull & { number: number } {
  return typeof node.number === "number";
}

function isIssue(node: RawIssue): node is RawIssue & { number: number } {
  return typeof node.number === "number";
}

function toPull(node: RawPull & { number: number }): PullItem {
  return {
    repo: node.repository.nameWithOwner,
    number: node.number,
    title: node.title,
    url: node.url,
    isDraft: node.isDraft,
    review: node.reviewDecision,
    checks: node.commits.nodes[0]?.commit.statusCheckRollup?.state ?? null,
    updatedAt: node.updatedAt
  };
}

function toIssue(node: RawIssue & { number: number }): IssueItem {
  return {
    repo: node.repository.nameWithOwner,
    number: node.number,
    title: node.title,
    url: node.url,
    updatedAt: node.updatedAt,
    assignees: node.assignees.nodes.map(a => a.login)
  };
}

function firstLine(text: string): string {
  return text.trim().split("\n")[0] ?? "";
}

function ownerOf(repo: string): string {
  return repo.split("/")[0] ?? repo;
}

type OwnerCount = { name: string; count: number };

/** 件数の多い持ち主から並べる。選んでいる持ち主は 0 件でも残す */
function countOwners(snap: Snapshot, chosen: string): OwnerCount[] {
  const counts = new Map<string, number>();
  for (const item of [...snap.prs, ...snap.issues]) {
    const name = ownerOf(item.repo);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  if (chosen !== "" && chosen !== "all" && !counts.has(chosen))
    counts.set(chosen, 0);

  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** パネルで選んだ持ち主。まだ選んでいなければ設定の持ち主、それも無ければすべて */
function resolveOwner(
  chosen: string,
  owners: OwnerCount[],
  defaultOwner: string
): string {
  if (chosen !== "") return chosen;

  return defaultOwner !== "" && owners.some(o => o.name === defaultOwner)
    ? defaultOwner
    : "all";
}

/** 端末の時刻帯での HH:mm */
function clockTime(iso: string): string {
  const d = new Date(Date.parse(iso));

  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ago(iso: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  if (days < 365) return `${Math.floor(days / 30)}か月前`;

  return `${Math.floor(days / 365)}年前`;
}

/** 全角の文字は 2 セル、それ以外は 1 セルと数える */
function cellWidth(ch: string): number {
  const c = ch.codePointAt(0) ?? 0;
  const isWide =
    (c >= 0x1100 && c <= 0x115f) ||
    (c >= 0x2e80 && c <= 0xa4cf) ||
    (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xfe30 && c <= 0xfe4f) ||
    (c >= 0xff00 && c <= 0xff60) ||
    (c >= 0xffe0 && c <= 0xffe6);

  return isWide ? 2 : 1;
}

/** cells セルに収まらなければ、後ろを「…」で切る */
function fit(text: string, cells: number): string {
  let total = 0;
  for (const ch of text) total += cellWidth(ch);
  if (total <= cells) return text;
  let used = 0;
  let out = "";
  for (const ch of text) {
    const w = cellWidth(ch);
    if (used + w > cells - 1) break;
    used += w;
    out += ch;
  }

  return `${out}…`;
}

type Chip = { label: string; color?: "error" | "success" | "warning" };

/** コンパクト表示の PR の札。いちばん手を動かす必要があるものを 1 つ出す */
function pullChip(pr: PullItem): Chip | null {
  if (pr.checks === "FAILURE" || pr.checks === "ERROR")
    return { label: "CI✗", color: "error" };
  if (pr.review === "CHANGES_REQUESTED")
    return { label: "変更", color: "error" };
  if (pr.isDraft) return { label: "Draft" };
  if (pr.review === "APPROVED") return { label: "承認", color: "success" };
  if (pr.review === "REVIEW_REQUIRED")
    return { label: "待ち", color: "warning" };

  return null;
}

function issueChip(issue: IssueItem): Chip | null {
  return issue.assignees.length === 0
    ? { label: "未担当", color: "warning" }
    : null;
}

async function openPane($: EngineInterface): Promise<UiOpenResult> {
  const opened = await $.ui.open({
    id: PANE,
    title: TITLE,
    columns: PANE_COLUMNS
  });
  await update($, paneTick, n => n + 1);

  return opened;
}

export const register: Register = (on, options) => {
  const defaultOwner =
    typeof options.defaultOwner === "string" ? options.defaultOwner.trim() : "";

  on("session.start", async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: "自分が起票した issue と自分の PR の一覧パネルを開く"
    });
    const stored = await $.store.get(STORE_OWNER);
    if (typeof stored === "string") await update($, owner, () => stored);
    const compact = await $.store.get(STORE_COMPACT);
    if (typeof compact === "boolean") await update($, isCompact, () => compact);
    void openPane($);
    // 最初のプロンプトを待たせないよう、取得は session.start の外で走らせる
    $.clock.after(0, () => {
      void refresh($);
    });
    $.clock.every(REFRESH_MS, () => {
      void refresh($);
    });

    return next(e);
  });

  on("command.run", { command: COMMAND }, async $ => {
    const opened = await openPane($);
    $.clock.after(0, () => {
      void refresh($);
    });

    return {
      text: opened.isPlaced
        ? "GitHub パネルを開きました。"
        : `GitHub パネルを開けませんでした（${opened.reason}）`
    };
  }).catch(() => ({ text: "GitHub パネルを開けませんでした。" }));

  // Bash そのものは止めない。失敗しても next(e) は一度走った結果をそのまま返す
  on("tool.call", { tool: "Bash" }, async ($, e, next) => {
    const ran = await next(e);
    if (TOUCHES_GITHUB.test(e.command)) {
      $.clock.after(1500, () => {
        void refresh($);
      });
    }

    return ran;
  }).catch(($, e, next) => next(e));

  // 閉じるのは止めない。閉じたことだけ帯に伝える
  on("ui.close", { id: PANE }, async ($, e, next) => {
    const closed = await next(e);
    await update($, paneTick, n => n + 1);

    return closed;
  }).catch(($, e, next) => next(e));

  // パネルが出ていない間だけ、入力欄の上に開くボタンを出す
  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e);
    await read($, paneTick);
    const isUp = (await $.ui.panes()).some(p => p.id === PANE && p.isPlaced);
    if (isUp) return next(e);

    const { Box, Text, Button } = $.ui.resolve(e);
    const snap = await read($, snapshot);
    const stored = await read($, owner);
    const chosen = resolveOwner(
      stored,
      countOwners(snap, stored),
      defaultOwner
    );
    const inScope = (repo: string) =>
      chosen === "all" || ownerOf(repo) === chosen;
    const prCount = snap.prs.filter(p => inScope(p.repo)).length;
    const issueCount = snap.issues.filter(i => inScope(i.repo)).length;
    const scope = chosen === "all" ? "" : `${chosen}: `;

    return (
      <Box flexDirection="row" columnGap={1} alignItems="center">
        <Button
          key="open-pane"
          label="GitHub を開く"
          onPress={() => openPane($)}
        />
        {snap.fetchedAt !== null && (
          <Text dimColor>{`${scope}PR ${prCount}・Issue ${issueCount}`}</Text>
        )}
      </Box>
    );
  });

  on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link } = $.ui.resolve(e);
    const snap = await read($, snapshot);
    const stored = await read($, owner);
    const compact = await read($, isCompact);
    const now = await $.clock.now();

    const owners = countOwners(snap, stored);
    const chosen = resolveOwner(stored, owners, defaultOwner);
    const inScope = (repo: string) =>
      chosen === "all" || ownerOf(repo) === chosen;
    const prs = snap.prs.filter(p => inScope(p.repo));
    const issues = snap.issues.filter(i => inScope(i.repo));
    const showRepo = new Set([...prs, ...issues].map(i => i.repo)).size > 1;
    const repoLabel = (repo: string) =>
      chosen === "all" ? repo : (repo.split("/")[1] ?? repo);
    const total = snap.prs.length + snap.issues.length;

    const choose = (name: string) => async () => {
      await update($, owner, () => name);
      await $.store.set(STORE_OWNER, name);
    };

    const toggleCompact = async () => {
      const next = !compact;
      await update($, isCompact, () => next);
      await $.store.set(STORE_COMPACT, next);
    };

    const status = snap.isLoading
      ? "読み込み中…"
      : snap.fetchedAt
        ? `${clockTime(snap.fetchedAt)} に更新`
        : "まだ読み込んでいません";

    const reviewChip = (review: Review) => {
      if (review === "APPROVED") return <Text color="success">承認済み</Text>;
      if (review === "CHANGES_REQUESTED")
        return <Text color="error">変更依頼</Text>;
      if (review === "REVIEW_REQUIRED")
        return <Text color="warning">レビュー待ち</Text>;

      return null;
    };

    const checksChip = (checks: Checks) => {
      if (checks === "SUCCESS") return <Text color="success">CI ✓</Text>;
      if (checks === "FAILURE" || checks === "ERROR")
        return <Text color="error">CI ✗</Text>;
      if (checks === "PENDING" || checks === "EXPECTED")
        return <Text color="warning">CI 実行中</Text>;

      return null;
    };

    const pullRow = (pr: PullItem) => (
      <Box key={`pr:${pr.url}`} flexDirection="column">
        <Link href={pr.url} label={pr.title} />
        <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
          <Text dimColor>{`#${pr.number}`}</Text>
          {showRepo && <Text dimColor>{repoLabel(pr.repo)}</Text>}
          {pr.isDraft ? <Text dimColor>Draft</Text> : reviewChip(pr.review)}
          {checksChip(pr.checks)}
          <Text dimColor>{ago(pr.updatedAt, now)}</Text>
        </Box>
      </Box>
    );

    const issueRow = (issue: IssueItem) => (
      <Box key={`issue:${issue.url}`} flexDirection="column">
        <Link href={issue.url} label={issue.title} />
        <Box flexDirection="row" flexWrap="wrap" columnGap={1}>
          <Text dimColor>{`#${issue.number}`}</Text>
          {showRepo && <Text dimColor>{repoLabel(issue.repo)}</Text>}
          {issue.assignees.length > 0 ? (
            <Text dimColor>{`担当 ${issue.assignees.join(", ")}`}</Text>
          ) : (
            <Text color="warning">担当なし</Text>
          )}
          <Text dimColor>{ago(issue.updatedAt, now)}</Text>
        </Box>
      </Box>
    );

    // コンパクト表示: 札＋#番号＋タイトルを 1 行に収める
    const room = Math.max(10, e.props.bodyColumns - CHIP_CELLS - 1);
    const compactRow = (
      key: string,
      url: string,
      label: string,
      chip: Chip | null
    ) => (
      <Box key={key} flexDirection="row" columnGap={1}>
        <Box width={CHIP_CELLS}>
          {chip && (
            <Text color={chip.color} dimColor={!chip.color}>
              {chip.label}
            </Text>
          )}
        </Box>
        <Link href={url} label={fit(label, room)} />
      </Box>
    );
    const numberLabel = (repo: string, n: number) =>
      showRepo ? `${repoLabel(repo)}#${n}` : `#${n}`;
    const compactPull = (pr: PullItem) =>
      compactRow(
        `pr:${pr.url}`,
        pr.url,
        `${numberLabel(pr.repo, pr.number)} ${pr.title}`,
        pullChip(pr)
      );
    const compactIssue = (issue: IssueItem) =>
      compactRow(
        `issue:${issue.url}`,
        issue.url,
        `${numberLabel(issue.repo, issue.number)} ${issue.title}`,
        issueChip(issue)
      );

    const cut = (shown: number, fetched: number, all: number) =>
      chosen === "all" && all > fetched
        ? `${shown}／${all} 件（新しい ${fetched} 件まで）`
        : `${shown} 件`;

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          <Button
            key="owner:all"
            label={`すべて ${total}`}
            variant={chosen === "all" ? "primary" : "secondary"}
            onPress={choose("all")}
          />
          {owners.map(o => (
            <Button
              key={`owner:${o.name}`}
              label={`${o.name} ${o.count}`}
              variant={chosen === o.name ? "primary" : "secondary"}
              onPress={choose(o.name)}
            />
          ))}
        </Box>
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Text dimColor>{status}</Text>
          <Box flexDirection="row" columnGap={1}>
            <Button
              key="density"
              label={compact ? "詳しく" : "コンパクト"}
              onPress={toggleCompact}
            />
            <Button key="refresh" label="更新" onPress={() => refresh($)} />
          </Box>
        </Box>
        {snap.error !== null && (
          <Text color="error">{`取得できませんでした: ${snap.error}`}</Text>
        )}
        <Box flexDirection="column" gap={compact ? 0 : 1}>
          <Text
            bold
          >{`PR ${cut(prs.length, snap.prs.length, snap.prTotal)}`}</Text>
          {prs.length === 0 && <Text dimColor>開いている PR はありません</Text>}
          {prs.map(compact ? compactPull : pullRow)}
        </Box>
        <Box flexDirection="column" gap={compact ? 0 : 1}>
          <Text
            bold
          >{`Issue ${cut(issues.length, snap.issues.length, snap.issueTotal)}`}</Text>
          {issues.length === 0 && (
            <Text dimColor>開いている issue はありません</Text>
          )}
          {issues.map(compact ? compactIssue : issueRow)}
        </Box>
      </Box>
    );
  });
};
