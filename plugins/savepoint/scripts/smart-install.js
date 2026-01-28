#!/usr/bin/env node
/**
 * Bun 自動インストール & 依存関係セットアップスクリプト
 * 参考: https://github.com/thedotmack/claude-mem
 */

import { execSync, spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pluginRoot = dirname(__dirname);

const IS_WINDOWS = process.platform === "win32";

// 一般的なBunのインストールパス（PATHが更新される前でも見つけられるように）
const BUN_COMMON_PATHS = IS_WINDOWS
  ? [join(homedir(), ".bun", "bin", "bun.exe")]
  : [
      join(homedir(), ".bun", "bin", "bun"),
      "/usr/local/bin/bun",
      "/opt/homebrew/bin/bun",
    ];

// バージョンマーカーファイル
const markerDir = join(homedir(), ".claude", "savepoint-cache");
const markerFile = join(markerDir, "install-marker");
const packageJsonPath = join(pluginRoot, "package.json");

/**
 * Bunの実行パスを取得（PATHまたは一般的なインストール場所から）
 */
function getBunPath() {
  // まずPATHを確認
  try {
    const result = spawnSync("bun", ["--version"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: IS_WINDOWS,
    });
    if (result.status === 0) return "bun";
  } catch {
    // PATHにない
  }

  // 一般的なインストールパスをチェック
  return BUN_COMMON_PATHS.find(existsSync) || null;
}

/**
 * Bunがインストールされているか確認
 */
function isBunInstalled() {
  return getBunPath() !== null;
}

/**
 * Bunのバージョンを取得
 */
function getBunVersion() {
  const bunPath = getBunPath();
  if (!bunPath) return null;

  try {
    const result = spawnSync(bunPath, ["--version"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      shell: IS_WINDOWS,
    });
    return result.status === 0 ? result.stdout.trim() : null;
  } catch {
    return null;
  }
}

/**
 * マーカーが有効かチェック
 */
function isMarkerValid() {
  if (!existsSync(markerFile)) return false;

  // node_modules が存在しなければ無効
  const nodeModulesPath = join(pluginRoot, "node_modules");
  if (!existsSync(nodeModulesPath)) return false;

  try {
    const marker = JSON.parse(readFileSync(markerFile, "utf-8"));
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return pkg.version === marker.version && getBunVersion() === marker.bun;
  } catch {
    return false;
  }
}

/**
 * マーカーを更新
 */
function updateMarker() {
  mkdirSync(markerDir, { recursive: true });
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  writeFileSync(
    markerFile,
    JSON.stringify({
      version: pkg.version,
      bun: getBunVersion(),
      installedAt: new Date().toISOString(),
    })
  );
}

/**
 * Bunをインストール
 */
function installBun() {
  console.error("🔧 Bun をインストール中...");
  try {
    if (IS_WINDOWS) {
      execSync('powershell -c "irm bun.sh/install.ps1 | iex"', {
        stdio: "inherit",
        shell: true,
      });
    } else {
      execSync("curl -fsSL https://bun.sh/install | bash", {
        stdio: "inherit",
        shell: true,
      });
    }

    if (!isBunInstalled()) {
      throw new Error(
        "Bun のインストールは完了しましたが、バイナリが見つかりません。" +
          "ターミナルを再起動してください。"
      );
    }

    const version = getBunVersion();
    console.error(`✅ Bun ${version} のインストールが完了しました`);
  } catch (err) {
    console.error("❌ Bun のインストールに失敗しました");
    console.error("   手動でインストールしてください:");
    console.error("   curl -fsSL https://bun.sh/install | bash");
    throw err;
  }
}

/**
 * 依存関係をインストール
 */
function installDependencies() {
  const nodeModulesPath = join(pluginRoot, "node_modules");
  if (existsSync(nodeModulesPath)) {
    return;
  }

  const bunPath = getBunPath();
  if (!bunPath) {
    throw new Error("Bun が見つかりません");
  }

  console.error("📦 依存関係をインストール中...");
  execSync(`"${bunPath}" install`, {
    cwd: pluginRoot,
    stdio: "inherit",
    shell: true,
  });
  console.error("✅ 依存関係のインストールが完了しました");
}

// メイン処理
function main() {
  // マーカーが有効なら即終了
  if (isMarkerValid()) {
    return;
  }

  // Bun チェック & インストール
  if (!isBunInstalled()) {
    installBun();
  }

  // 依存関係インストール
  installDependencies();

  // マーカーを更新
  updateMarker();
}

try {
  main();
} catch (e) {
  console.error("❌ インストールに失敗しました:", e.message);
  process.exit(1);
}
