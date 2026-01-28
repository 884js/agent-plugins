#!/usr/bin/env bun
/**
 * 指定したセーブポイントに戻す
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
const { getRepoPath, readConfig, syncFromRepo, normalizeTagName, tagExists } = utils;

$.verbose = false;

async function main() {
  // 引数チェック
  if (!process.argv[2]) {
    console.log("エラー: セーブポイント名を指定してください");
    console.log("使用方法: restore.ts <savepoint-name>");
    console.log("例: restore.ts 20250126-153045");
    process.exit(1);
  }

  // リポジトリパスを取得
  const repoPath = getRepoPath(process.cwd());

  // リポジトリが存在するか確認
  if (!existsSync(join(repoPath, ".git"))) {
    console.log("エラー: セーブポイントが見つかりません");
    process.exit(1);
  }

  // タグ名を正規化（savepoint/プレフィックスを追加）
  const tagName = normalizeTagName(process.argv[2]);

  // 指定されたタグが存在するか確認
  if (!(await tagExists(repoPath, tagName))) {
    console.log(`エラー: セーブポイント '${tagName}' が見つかりません`);
    process.exit(1);
  }

  // リポジトリをセーブポイントの状態にリセット
  await $`git -C ${repoPath} reset --hard ${tagName}`.quiet();

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
  console.log(`復元完了: ${tagName}`);
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
