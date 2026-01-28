#!/usr/bin/env bun
/**
 * セーブポイントリポジトリを手動でクリーンアップ
 */

import { rmSync, existsSync } from "fs";
import { dirname } from "path";
import { getRepoPath, clearPendingSession } from "../../../scripts/lib/utils";

async function main() {
  // プロジェクトディレクトリ（カレントディレクトリ）
  const projectPath = process.cwd();

  // .claude/ 配下は対象外
  if (projectPath.includes("/.claude/") || projectPath.endsWith("/.claude")) {
    console.log("このディレクトリはセーブポイント対象外です");
    process.exit(0);
  }

  // セーブポイントリポジトリのパスを取得
  const repoPath = getRepoPath(projectPath);
  const baseDir = dirname(repoPath); // /repo の親ディレクトリ

  // ベースディレクトリが存在すれば削除（diffs/, config.json なども含む）
  if (existsSync(baseDir)) {
    rmSync(baseDir, { recursive: true, force: true });
    console.log("セーブポイントをクリーンアップしました: " + baseDir);
  } else {
    console.log("セーブポイントは存在しません");
  }

  // セッションファイルも削除
  clearPendingSession(projectPath);
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
