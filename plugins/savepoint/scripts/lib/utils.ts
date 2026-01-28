/**
 * セーブポイント共通ユーティリティ関数
 */

import { $, quote } from "zx";
import { createHash } from "crypto";

// zx 8.x + bun 環境では quote 関数が未定義になるため、明示的に設定
$.shell = "/bin/bash";
$.quote = quote;
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  statSync,
  realpathSync,
  lstatSync,
  unlinkSync,
} from "fs";
import { join, dirname, relative } from "path";
import { homedir, tmpdir } from "os";

// zx の設定
$.verbose = false;

// セーブポイントリポジトリのベースディレクトリ
export const SAVEPOINT_REPOS_BASE = join(homedir(), ".claude", "savepoint-repos");

/**
 * プロジェクトパスから12文字のハッシュを計算
 */
export function getProjectHash(projectPath: string = process.cwd()): string {
  const realPath = realpathSync(projectPath);
  const hash = createHash("sha256").update(realPath).digest("hex");
  return hash.slice(0, 12);
}

/**
 * 一時セッションファイルのパスを取得
 */
function getPendingSessionFile(projectPath: string): string {
  const projectHash = getProjectHash(projectPath);
  return join(SAVEPOINT_REPOS_BASE, `.pending-session-${projectHash}`);
}

/**
 * 現在のセッションIDを取得
 */
export function getSessionId(projectPath: string = process.cwd()): string | null {
  const projectHash = getProjectHash(projectPath);

  // 一時ファイルをまずチェック
  const tempSessionFile = getPendingSessionFile(projectPath);
  if (existsSync(tempSessionFile)) {
    return readFileSync(tempSessionFile, "utf-8").trim();
  }

  // 最新のセッションディレクトリのconfig.jsonから読み取り
  if (!existsSync(SAVEPOINT_REPOS_BASE)) {
    return null;
  }

  const dirs = readdirSync(SAVEPOINT_REPOS_BASE)
    .filter((name) => name.startsWith(`${projectHash}-`))
    .map((name) => ({
      name,
      path: join(SAVEPOINT_REPOS_BASE, name),
    }))
    .filter((d) => statSync(d.path).isDirectory())
    .sort((a, b) => b.name.localeCompare(a.name));

  if (dirs.length > 0) {
    const configPath = join(dirs[0].path, "config.json");
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, "utf-8"));
        return config.session_id || null;
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * セッションIDを一時保存
 */
export function saveSessionId(sessionId: string, projectPath: string = process.cwd()): void {
  mkdirSync(SAVEPOINT_REPOS_BASE, { recursive: true });
  const tempSessionFile = getPendingSessionFile(projectPath);
  writeFileSync(tempSessionFile, sessionId);
}

/**
 * 一時セッションファイルを削除
 */
export function clearPendingSession(projectPath: string = process.cwd()): void {
  const tempSessionFile = getPendingSessionFile(projectPath);
  if (existsSync(tempSessionFile)) {
    rmSync(tempSessionFile);
  }
}

/**
 * プロジェクトのセーブポイントベースディレクトリパスを取得
 */
export function getBaseDir(projectPath: string = process.cwd()): string {
  const projectHash = getProjectHash(projectPath);
  const sessionId = getSessionId(projectPath);

  if (sessionId) {
    return join(SAVEPOINT_REPOS_BASE, `${projectHash}-${sessionId}`);
  }
  return join(SAVEPOINT_REPOS_BASE, projectHash);
}

/**
 * プロジェクトのセーブポイントリポジトリパスを取得（repo/サブディレクトリ）
 */
export function getRepoPath(projectPath: string = process.cwd()): string {
  return join(getBaseDir(projectPath), "repo");
}

/**
 * diffsディレクトリパスを取得
 */
export function getDiffsDir(repoPath: string): string {
  return join(dirname(repoPath), "diffs");
}

/**
 * config.jsonパスを取得
 */
export function getConfigFile(repoPath: string): string {
  return join(dirname(repoPath), "config.json");
}

/**
 * config.json を読み込む
 */
export function readConfig(repoPath: string): {
  source_path: string;
  session_id: string;
  created_at: string;
} | null {
  const configFile = getConfigFile(repoPath);
  if (!existsSync(configFile)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(configFile, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * セーブポイントリポジトリを初期化
 */
export async function initRepo(projectPath: string = process.cwd()): Promise<string> {
  const baseDir = getBaseDir(projectPath);
  const repoPath = join(baseDir, "repo");
  const diffsDir = join(baseDir, "diffs");
  const configFile = join(baseDir, "config.json");

  if (!existsSync(join(repoPath, ".git"))) {
    mkdirSync(repoPath, { recursive: true });
    mkdirSync(diffsDir, { recursive: true });

    await $`git -C ${repoPath} init --quiet`;

    const realPath = realpathSync(projectPath);
    const sessionId = getSessionId(projectPath);

    const config = {
      source_path: realPath,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    };
    writeFileSync(configFile, JSON.stringify(config, null, 2));

    // 一時セッションファイルを削除
    clearPendingSession(projectPath);

    // 空のコミットで初期化
    await $`git -C ${repoPath} commit --quiet --allow-empty -m ${"Initialize savepoint repository"}`;
  }

  return repoPath;
}

/**
 * git ls-files で追跡ファイル一覧を取得
 * ワーキングツリーに実際に存在するファイルのみ返す
 */
async function getGitTrackedFiles(projectPath: string): Promise<Set<string>> {
  try {
    const result = await $`git -C ${projectPath} ls-files`.quiet();
    const files = result.stdout.trim().split("\n").filter(Boolean);
    // ワーキングツリーに実際に存在するファイルのみ返す
    return new Set(files.filter((f) => existsSync(join(projectPath, f))));
  } catch {
    return new Set();
  }
}

/**
 * ディレクトリ内のファイル一覧を取得（.git除く）
 */
function getAllFiles(dir: string, base: string = ""): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const relativePath = base ? join(base, entry.name) : entry.name;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else {
      files.push(relativePath);
    }
  }
  return files;
}

/**
 * プロジェクトファイルをリポジトリに同期（git管理プロジェクトのみ対応）
 */
export async function syncToRepo(projectPath: string = process.cwd()): Promise<boolean> {
  const repoPath = getRepoPath(projectPath);

  // git管理プロジェクトのみ対応
  try {
    await $`git -C ${projectPath} rev-parse --git-dir`.quiet();
  } catch {
    console.error("警告: git管理されていないプロジェクトはセーブポイント対象外です");
    return false;
  }

  // git ls-files のファイル一覧を取得
  const trackedFiles = await getGitTrackedFiles(projectPath);

  // 追跡ファイルがない場合はスキップ
  if (trackedFiles.size === 0) {
    return true;
  }

  // 一時ファイルにファイルリストを書き出し
  const tmpFile = join(tmpdir(), `savepoint-files-${Date.now()}.txt`);
  writeFileSync(tmpFile, [...trackedFiles].join("\n"));

  try {
    // rsync でファイル同期
    await $`rsync -a --files-from=${tmpFile} ${projectPath}/ ${repoPath}/`;
  } finally {
    rmSync(tmpFile, { force: true });
  }

  // 宛先側のファイルリスト（.git以外）
  const dstFiles = new Set(getAllFiles(repoPath));

  // 削除すべきファイル = 宛先にあってソースにないファイル
  const toDelete = [...dstFiles].filter((f) => !trackedFiles.has(f));

  for (const file of toDelete) {
    const fullPath = join(repoPath, file);
    rmSync(fullPath, { force: true });
  }

  // 空ディレクトリを削除
  removeEmptyDirs(repoPath);

  return true;
}

/**
 * 空ディレクトリを再帰的に削除
 */
function removeEmptyDirs(dir: string): void {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    if (entry.isDirectory()) {
      removeEmptyDirs(join(dir, entry.name));
    }
  }

  // 自身が空なら削除
  const entries = readdirSync(dir).filter((e) => e !== ".git");
  if (entries.length === 0 && dir !== getRepoPath()) {
    try {
      rmSync(dir, { recursive: true });
    } catch {
      // 削除失敗は無視
    }
  }
}

/**
 * リポジトリからプロジェクトに同期（復元）
 */
export async function syncFromRepo(repoPath: string, projectPath: string): Promise<void> {
  if (!repoPath || !projectPath) {
    throw new Error("リポジトリパスとプロジェクトパスが必要です");
  }

  // リポジトリ側のファイルリスト
  const repoFiles = new Set(getAllFiles(repoPath));

  if (repoFiles.size === 0) {
    return;
  }

  // 一時ファイルにファイルリストを書き出し
  const tmpFile = join(tmpdir(), `savepoint-restore-${Date.now()}.txt`);
  writeFileSync(tmpFile, [...repoFiles].join("\n"));

  try {
    // rsync でファイル同期
    await $`rsync -a --files-from=${tmpFile} ${repoPath}/ ${projectPath}/`;
  } finally {
    rmSync(tmpFile, { force: true });
  }

  // プロジェクト側: git管理ファイルのみ対象
  const projectFiles = await getGitTrackedFiles(projectPath);

  // 削除対象 = プロジェクトにあってリポジトリにないgit管理ファイル
  const toDelete = [...projectFiles].filter((f) => !repoFiles.has(f));

  for (const file of toDelete) {
    const fullPath = join(projectPath, file);
    try {
      const stat = lstatSync(fullPath);
      if (stat.isSymbolicLink()) {
        unlinkSync(fullPath);
      } else {
        rmSync(fullPath, { force: true });
      }
    } catch {
      // ファイルが既に存在しない場合は無視
    }
  }

  // 空ディレクトリを削除
  removeEmptyDirs(projectPath);
}

/**
 * stdin から JSON を読み取りパース
 */
export async function readHookInput(): Promise<{
  session_id?: string;
  hook_event_name?: string;
  [key: string]: unknown;
}> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks).toString("utf-8").trim();

  if (!input) {
    return {};
  }

  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

/**
 * セーブポイントタグ一覧を取得
 */
export async function getSavepointTags(
  repoPath: string,
  limit?: number
): Promise<{ tag: string; date: string; summary: string }[]> {
  try {
    const result =
      await $`git -C ${repoPath} for-each-ref --format=${"%(refname:short)|%(creatordate:short)|%(contents:subject)"} --sort=-creatordate refs/tags/savepoint/`.quiet();

    const lines = result.stdout.trim().split("\n").filter(Boolean);
    const tags = lines.map((line) => {
      const [tag, date, summary] = line.split("|");
      return {
        tag: tag.replace("savepoint/", ""),
        date: date || "",
        summary: summary || "(要約なし)",
      };
    });

    return limit ? tags.slice(0, limit) : tags;
  } catch {
    return [];
  }
}

/**
 * タグ名を正規化（savepoint/ プレフィックスを追加）
 */
export function normalizeTagName(tagName: string): string {
  if (tagName.startsWith("savepoint/")) {
    return tagName;
  }
  return `savepoint/${tagName}`;
}

/**
 * タグが存在するか確認
 */
export async function tagExists(repoPath: string, tagName: string): Promise<boolean> {
  const normalizedTag = normalizeTagName(tagName);
  try {
    await $`git -C ${repoPath} rev-parse ${normalizedTag}`.quiet();
    return true;
  } catch {
    return false;
  }
}
