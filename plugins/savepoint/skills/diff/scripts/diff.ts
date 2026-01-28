#!/usr/bin/env bun
/**
 * セーブポイントとの差分を表示
 */

import { $ } from "zx";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// プラグインルートからutilsをインポート
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginRoot = join(__dirname, "../../..");

// 動的インポート（相対パスを解決）
const utils = await import(join(pluginRoot, "scripts/lib/utils.ts"));
const { getRepoPath, syncToRepo, normalizeTagName, tagExists } = utils;

$.verbose = false;

async function main() {
  // リポジトリパスを取得
  const repoPath = getRepoPath(process.cwd());

  // リポジトリが存在するか確認
  if (!existsSync(join(repoPath, ".git"))) {
    console.log("エラー: セーブポイントが見つかりません");
    process.exit(1);
  }

  // 引数を解析
  let tag1 = process.argv[2];
  let tag2 = process.argv[3];

  // 引数がない場合、最新のタグを取得
  if (!tag1) {
    try {
      const result = await $`git -C ${repoPath} tag -l ${"savepoint/*"} --sort=-creatordate`.quiet();
      const tags = result.stdout.trim().split("\n").filter(Boolean);
      if (tags.length === 0) {
        console.log("エラー: セーブポイントがありません");
        process.exit(1);
      }
      tag1 = tags[0];
    } catch {
      console.log("エラー: セーブポイントがありません");
      process.exit(1);
    }
  }

  // タグ名を正規化
  tag1 = normalizeTagName(tag1);
  if (tag2) {
    tag2 = normalizeTagName(tag2);
  }

  // タグが存在するか確認
  if (!(await tagExists(repoPath, tag1))) {
    console.log(`エラー: セーブポイント '${tag1}' が見つかりません`);
    process.exit(1);
  }
  if (tag2 && !(await tagExists(repoPath, tag2))) {
    console.log(`エラー: セーブポイント '${tag2}' が見つかりません`);
    process.exit(1);
  }

  if (!tag2) {
    // 現在との差分
    // プロジェクトの最新状態をリポジトリに同期（コミットなし）
    await syncToRepo(process.cwd());

    console.log(`変更されたファイル (${tag1} → 現在):`);
    const nameStatus = await $`git -C ${repoPath} diff --name-status ${tag1}`.quiet();
    console.log(nameStatus.stdout);
    console.log("");
    const diff = await $`git -C ${repoPath} diff ${tag1}`.quiet();
    console.log(diff.stdout);
  } else {
    // セーブポイント間の差分
    console.log(`変更されたファイル (${tag1} → ${tag2}):`);
    const nameStatus = await $`git -C ${repoPath} diff --name-status ${tag1} ${tag2}`.quiet();
    console.log(nameStatus.stdout);
    console.log("");
    const diff = await $`git -C ${repoPath} diff ${tag1} ${tag2}`.quiet();
    console.log(diff.stdout);
  }
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
