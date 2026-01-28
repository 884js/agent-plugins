#!/usr/bin/env bun
/**
 * セーブポイント一覧を表示
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// プラグインルートからutilsをインポート
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginRoot = join(__dirname, "../../..");

// 動的インポート（相対パスを解決）
const utils = await import(join(pluginRoot, "scripts/lib/utils.ts"));
const { getRepoPath, getSavepointTags } = utils;

async function main() {
  // リポジトリパスを取得
  const repoPath = getRepoPath(process.cwd());

  // リポジトリが存在するか確認
  if (!existsSync(join(repoPath, ".git"))) {
    console.log("このプロジェクトにはセーブポイントがありません");
    process.exit(0);
  }

  // セーブポイント一覧を取得
  const tags = await getSavepointTags(repoPath);

  console.log("セーブポイント一覧:");
  console.log("");

  for (const { tag, date, summary } of tags) {
    console.log(`  [${tag}] ${date}`);
    console.log(`    ${summary}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
