#!/usr/bin/env bun
/**
 * Gitベースのセーブポイント作成スクリプト
 */

import { $, quote } from "zx";
import { writeFileSync } from "fs";

// zx 8.x + bun 環境では quote 関数が未定義になるため、明示的に設定
$.shell = "/bin/bash";
$.quote = quote;
import {
  initRepo,
  syncToRepo,
  saveSessionId,
  clearPendingSession,
  getDiffsDir,
  readHookInput,
} from "./lib/utils";

$.verbose = false;

async function main() {
  // stdinからJSONを読み取り（フック入力）
  const hookInput = await readHookInput();
  const sessionId = hookInput.session_id as string | undefined;

  // プロジェクトディレクトリ（カレントディレクトリ）
  const projectPath = process.cwd();

  // .claude/ 配下はセーブポイント対象外
  if (projectPath.includes("/.claude/") || projectPath.endsWith("/.claude")) {
    process.exit(0);
  }

  // SessionStartの場合、セッションIDを保存
  if (sessionId) {
    saveSessionId(sessionId, projectPath);
  }

  // セーブポイントリポジトリを初期化（初回のみ）
  const repoPath = await initRepo(projectPath);

  // pending-session は initRepo 完了後は不要なので削除
  clearPendingSession(projectPath);

  // プロジェクトファイルをリポジトリに同期
  const synced = await syncToRepo(projectPath);
  if (!synced) {
    process.exit(0);
  }

  // 変更をコミット
  await $`git -C ${repoPath} add -A`;

  // 変更があるか確認
  try {
    await $`git -C ${repoPath} diff --cached --quiet`;
    // 変更なし
    await $`git -C ${repoPath} reset --quiet HEAD`;
    process.exit(0);
  } catch {
    // 変更あり - 続行
  }

  // コミットを作成
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 15);
  await $`git -C ${repoPath} commit --quiet -m ${`Savepoint: ${timestamp}`}`;

  // 前のセーブポイントを取得（タグ作成前に取得する必要がある）
  let prevTag: string | null = null;
  try {
    const result = await $`git -C ${repoPath} tag -l ${"savepoint/*"} --sort=-creatordate`.quiet();
    const tags = result.stdout.trim().split("\n").filter(Boolean);
    if (tags.length > 0) {
      prevTag = tags[0];
    }
  } catch {
    // タグがない場合は無視
  }

  // タグを作成
  const tagName = `savepoint/${timestamp}`;
  const diffBasename = timestamp;

  // 要約を生成
  let summary: string;
  if (!prevTag) {
    summary = "Initial savepoint";
  } else {
    // 変更行数を取得
    const statResult = await $`git -C ${repoPath} diff --stat ${prevTag} HEAD`.quiet();
    const statLine = statResult.stdout.trim().split("\n").pop() || "";

    const insertionsMatch = statLine.match(/(\d+) insertion/);
    const deletionsMatch = statLine.match(/(\d+) deletion/);
    const insertions = insertionsMatch ? insertionsMatch[1] : "0";
    const deletions = deletionsMatch ? deletionsMatch[1] : "0";

    // 全ファイルのステータスを取得
    const filesResult = await $`git -C ${repoPath} diff --name-status ${prevTag} HEAD`.quiet();
    const files = filesResult.stdout.trim();

    if (files) {
      const fileLines = files.split("\n").filter(Boolean);
      const fileCount = fileLines.length;
      const fileList = fileLines
        .map((line: string) => {
          const [status, ...pathParts] = line.split("\t");
          return `${status}:${pathParts.join("\t")}`;
        })
        .join(" ");
      summary = `+${insertions}/-${deletions} | ${fileCount} files | ${fileList}`;
    } else {
      summary = "No changes";
    }
  }

  // アノテーション付きタグを作成
  await $`git -C ${repoPath} tag -a -m ${summary} ${tagName}`;

  // diffを保存
  const diffDir = getDiffsDir(repoPath);
  const diffFile = `${diffDir}/${diffBasename}.diff`;

  if (!prevTag) {
    // 初回セーブポイント
    writeFileSync(diffFile, "Initial savepoint\n");
  } else {
    // 前のセーブポイントとのdiffを保存
    const diffResult = await $`git -C ${repoPath} diff ${prevTag} ${tagName}`.quiet();
    writeFileSync(diffFile, diffResult.stdout);
  }

  console.error(`セーブポイント作成: ${tagName}`);
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
