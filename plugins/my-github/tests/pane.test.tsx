import type { On } from "claude-code";
import { expect, mock, test } from "claude-code/testing";

const PANE = {
  plugin: "my-github",
  component: "Pane",
  requestId: "my-github",
  props: {
    title: "GitHub",
    isFocused: false,
    bodyColumns: 48,
    placement: "dock",
    scroll: { offset: 0, bodyRows: 60 },
    view: {}
  }
} as const;

const BAND = {
  plugin: "my-github",
  component: "AbovePrompt",
  requestId: "above-prompt",
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 4,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 3 },
    view: {}
  }
} as const;

const NOW = Date.parse("2026-11-16T03:00:00Z");

/** 端末の時刻帯で NOW を HH:mm にしたもの */
const NOW_CLOCK = (() => {
  const d = new Date(NOW);

  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
})();

const RESPONSE = {
  data: {
    prs: {
      issueCount: 2,
      nodes: [
        {
          number: 101,
          title: "ログイン画面のボタンを揃える",
          url: "https://github.com/acme/web/pull/101",
          isDraft: false,
          reviewDecision: "APPROVED",
          updatedAt: "2026-11-16T01:00:00Z",
          repository: { nameWithOwner: "acme/web" },
          commits: {
            nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }]
          }
        },
        {
          number: 7,
          title: "個人のメモアプリの PR",
          url: "https://github.com/someone/notes/pull/7",
          isDraft: true,
          reviewDecision: null,
          updatedAt: "2026-11-15T06:00:00Z",
          repository: { nameWithOwner: "someone/notes" },
          commits: { nodes: [{ commit: { statusCheckRollup: null } }] }
        }
      ]
    },
    issues: {
      issueCount: 1,
      nodes: [
        {
          number: 202,
          title: "設定画面の保存ボタンが押せない",
          url: "https://github.com/acme/web/issues/202",
          updatedAt: "2026-11-13T03:00:00Z",
          repository: { nameWithOwner: "acme/web" },
          assignees: { nodes: [] }
        }
      ]
    }
  }
};

/** エンジンの代わりに答える。gh は RESPONSE を返し、パネルは出せたことにする */
function standIn(on: On) {
  const clock = mock.clock(on, { now: NOW });
  mock.store(on);
  on("command.register", () => ({ value: { command: "my-github" } }));
  on("ui.open", () => ({ value: { isPlaced: true } }));
  on("session.start", (_, e) => ({ cwd: e.cwd }));
  on("process.run", () => ({
    value: {
      exitCode: 0,
      stdout: JSON.stringify(RESPONSE),
      stderr: "",
      isStdoutTruncated: false,
      isStderrTruncated: false
    }
  }));

  return clock;
}

test(
  "設定した持ち主に絞り、すべてに切り替えるとほかの持ち主の PR も出る",
  { options: { defaultOwner: "acme" } },
  async ($, on) => {
    const clock = standIn(on);
    await $.session.start({
      cwd: "/",
      surface: "desktop",
      isInteractive: true
    });
    await clock.settle();

    for (const surface of ["terminal", "desktop"] as const) {
      const ui = await $.ui.mount({ ...PANE, surface });

      expect(
        (await ui.find({ type: "Link", text: /ボタンを揃える/ }))?.text
      ).toBeDefined();
      expect(
        await ui.find({ type: "Link", text: /メモアプリ/ })
      ).toBeUndefined();
      expect((await ui.find({ type: "Text", text: /^CI ✗$/ }))?.text).toBe(
        "CI ✗"
      );
      expect((await ui.find({ type: "Text", text: /^担当なし$/ }))?.text).toBe(
        "担当なし"
      );
      expect((await ui.find({ type: "Text", text: /^2時間前$/ }))?.text).toBe(
        "2時間前"
      );
      expect((await ui.find({ type: "Text", text: /に更新$/ }))?.text).toBe(
        `${NOW_CLOCK} に更新`
      );

      await ui.press({ key: "owner:all" });
      expect(
        (await ui.find({ type: "Link", text: /メモアプリ/ }))?.text
      ).toBeDefined();
      expect((await ui.find({ type: "Text", text: /^Draft$/ }))?.text).toBe(
        "Draft"
      );

      await ui.press({ key: "owner:acme" });
      await ui.unmount();
    }
  }
);

test("持ち主を設定していなければ、すべてを出す", async ($, on) => {
  const clock = standIn(on);
  await $.session.start({ cwd: "/", surface: "desktop", isInteractive: true });
  await clock.settle();

  const ui = await $.ui.mount({ ...PANE, surface: "desktop" });
  expect(
    (await ui.find({ type: "Link", text: /メモアプリ/ }))?.text
  ).toBeDefined();
  expect(
    (await ui.find({ type: "Link", text: /ボタンを揃える/ }))?.text
  ).toBeDefined();
  await ui.unmount();
});

test(
  "設定した持ち主の項目が無くても、その持ち主に絞って 0 件として出す",
  { options: { defaultOwner: "nobody" } },
  async ($, on) => {
    const clock = standIn(on);
    await $.session.start({
      cwd: "/",
      surface: "desktop",
      isInteractive: true
    });
    await clock.settle();

    const ui = await $.ui.mount({ ...PANE, surface: "desktop" });
    expect(await ui.find({ key: "owner:nobody" })).toBeDefined();
    expect(await ui.find({ type: "Link" })).toBeUndefined();
    expect(
      (await ui.find({ type: "Text", text: /開いている PR はありません/ }))
        ?.text
    ).toBe("開いている PR はありません");
    await ui.unmount();
  }
);

test(
  "コンパクトにすると、札と #番号つきのタイトルを幅に収めて 1 行で出す",
  { options: { defaultOwner: "acme" } },
  async ($, on) => {
    const clock = standIn(on);
    await $.session.start({
      cwd: "/",
      surface: "desktop",
      isInteractive: true
    });
    await clock.settle();

    for (const surface of ["terminal", "desktop"] as const) {
      // 幅 28 セル: 札の列 7 と間 1 を除いた 20 セルにタイトルを収める
      const ui = await $.ui.mount({
        ...PANE,
        surface,
        props: { ...PANE.props, bodyColumns: 28 }
      });

      await ui.press({ key: "density" });
      expect((await ui.find({ type: "Text", text: /^CI✗$/ }))?.text).toBe(
        "CI✗"
      );
      expect((await ui.find({ type: "Text", text: /^未担当$/ }))?.text).toBe(
        "未担当"
      );
      expect((await ui.find({ type: "Link", text: /^#101 / }))?.text).toBe(
        "#101 ログイン画面の…"
      );
      expect(
        await ui.find({ type: "Text", text: /^2時間前$/ })
      ).toBeUndefined();

      await ui.press({ key: "density" });
      expect((await ui.find({ type: "Text", text: /^CI ✗$/ }))?.text).toBe(
        "CI ✗"
      );
      await ui.unmount();
    }
  }
);

test(
  "パネルが出ていない間だけ、入力欄の上に開くボタンを出す",
  { options: { defaultOwner: "acme" } },
  async ($, on) => {
    const clock = mock.clock(on, { now: NOW });
    mock.store(on);
    // エンジンの代わりに、出ているパネルを覚えておく。
    // セッション開始で頼まれずに開いたときは出せず、人が押して開いたときは出せる
    let placed: string[] = [];
    let opens = 0;
    on("command.register", () => ({ value: { command: "my-github" } }));
    on("ui.open", (_, e) => {
      opens += 1;
      if (opens === 1) return { value: { isPlaced: false, reason: "narrow" } };
      placed = [e.id];

      return { value: { isPlaced: true } };
    });
    // 帯を描かないときに下へ回した分は、エンジンの代わりにこれが描く
    on("ui.render", { component: "AbovePrompt" }, ($, e) => {
      const { Text } = $.ui.resolve(e);

      return <Text>engine</Text>;
    });
    on("ui.panes", () => ({
      value: placed.map(id => ({
        id,
        title: "GitHub",
        isShown: true,
        isFocused: false,
        isPlaced: true
      }))
    }));
    on("session.start", (_, e) => ({ cwd: e.cwd }));
    let runs = 0;
    on("process.run", () => {
      runs += 1;

      return {
        value: {
          exitCode: 0,
          stdout: JSON.stringify(RESPONSE),
          stderr: "",
          isStdoutTruncated: false,
          isStderrTruncated: false
        }
      };
    });

    await $.session.start({
      cwd: "/",
      surface: "desktop",
      isInteractive: true
    });
    await clock.settle();

    for (const surface of ["terminal", "desktop"] as const) {
      placed = [];
      const band = await $.ui.mount({ ...BAND, surface });
      expect(await band.find({ key: "open-pane" })).toBeDefined();
      expect((await band.find({ type: "Text", text: /PR/ }))?.text).toBe(
        "acme: PR 1・Issue 1"
      );

      // 押して開いたときも一覧を取り直す
      const before = runs;
      await band.press({ key: "open-pane" });
      await clock.settle();
      expect(runs).toBe(before + 1);
      expect(placed).toEqual(["my-github"]);
      expect(await band.find({ key: "open-pane" })).toBeUndefined();
      expect((await band.find({ type: "Text", text: /engine/ }))?.text).toBe(
        "engine"
      );
      await band.unmount();
    }
  }
);

test("gh が失敗したら理由を出す", async ($, on) => {
  const clock = mock.clock(on, { now: NOW });
  mock.store(on);
  on("command.register", () => ({ value: { command: "my-github" } }));
  on("ui.open", () => ({ value: { isPlaced: true } }));
  on("session.start", (_, e) => ({ cwd: e.cwd }));
  on("process.run", () => ({
    value: {
      exitCode: 1,
      stdout: "",
      stderr: "To get started with GitHub CLI, please run:  gh auth login\n",
      isStdoutTruncated: false,
      isStderrTruncated: false
    }
  }));

  await $.session.start({ cwd: "/", surface: "desktop", isInteractive: true });
  await clock.settle();

  const ui = await $.ui.mount({ ...PANE, surface: "desktop" });
  expect(
    (await ui.find({ type: "Text", text: /取得できませんでした/ }))?.text
  ).toBe(
    "取得できませんでした: To get started with GitHub CLI, please run:  gh auth login"
  );
  await ui.unmount();
});
