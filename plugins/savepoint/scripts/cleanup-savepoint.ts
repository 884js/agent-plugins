#!/usr/bin/env bun
/**
 * セッション終了時にセーブポイントリポジトリを削除
 */

import { rmSync, existsSync } from "fs";
import { dirname } from "path";
import { getRepoPath, clearPendingSession, readHookInput } from "./lib/utils";

async function main() {
  // stdinからJSONを読み取り（フック入力）
  await readHookInput();

  // プロジェクトディレクトリ（カレントディレクトリ）
  const projectPath = process.cwd();

  // .claude/ 配下は対象外
  if (projectPath.includes("/.claude/") || projectPath.endsWith("/.claude")) {
    process.exit(0);
  }

  // セーブポイントリポジトリのパスを取得（セッションID付き）
  const repoPath = getRepoPath(projectPath);
  const baseDir = dirname(repoPath); // /repo の親ディレクトリ

  // ベースディレクトリが存在すれば削除（diffs/, config.json なども含む）
  if (existsSync(baseDir)) {
    rmSync(baseDir, { recursive: true, force: true });
    console.error("セーブポイントをクリーンアップしました");
  }

  // セッションファイルも削除
  clearPendingSession(projectPath);
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
