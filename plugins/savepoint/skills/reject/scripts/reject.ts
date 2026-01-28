#!/usr/bin/env bun
/**
 * 直前のセーブポイントに戻す
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
const { getRepoPath, getConfigFile, readConfig, syncFromRepo } = utils;

$.verbose = false;

async function main() {
  // リポジトリパスを取得
  const repoPath = getRepoPath(process.cwd());

  // リポジトリが存在するか確認
  if (!existsSync(join(repoPath, ".git"))) {
    console.log("エラー: セーブポイントが見つかりません");
    process.exit(1);
  }

  // 直前のセーブポイントタグを取得（最新の1つ前）
  let targetTag: string | null = null;
  try {
    const result = await $`git -C ${repoPath} tag -l ${"savepoint/*"} --sort=-creatordate`.quiet();
    const tags = result.stdout.trim().split("\n").filter(Boolean);
    if (tags.length >= 2) {
      targetTag = tags[1]; // 1つ前
    } else if (tags.length === 1) {
      targetTag = tags[0]; // 1つしかない場合は最新を使用
    }
  } catch {
    // タグがない場合
  }

  if (!targetTag) {
    console.log("エラー: セーブポイントがありません");
    process.exit(1);
  }

  // リポジトリをセーブポイントの状態にリセット
  await $`git -C ${repoPath} reset --hard ${targetTag}`.quiet();

  // 設定ファイルからソースパスを取得
  const config = readConfig(repoPath);
  if (!config) {
    console.log("エラー: 設定ファイルが見つかりません");
    process.exit(1);
  }
  const sourcePath = config.source_path;

  // リポジトリからプロジェクトディレクトリにファイルを同期
  await syncFromRepo(repoPath, sourcePath);

  // 結果を出力
  console.log(`復元完了: ${targetTag}`);
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
