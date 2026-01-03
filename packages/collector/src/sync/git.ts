/**
 * Git repository discovery and data extraction module.
 */

import { execSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getEffectiveHostname } from "../utils/hostname.js";
import type { SyncGitRepo, GitBranch, GitCommit } from "../api/types.js";

// Directories to skip during git repo discovery
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  "vendor",
  "__pycache__",
  ".cache",
  ".git",
]);

// Maximum depth for recursive directory search
const MAX_SEARCH_DEPTH = 5;

/**
 * Information about a discovered Git repository.
 */
export interface GitRepoInfo {
  /** Absolute path to the repository */
  path: string;
  /** Normalized origin URL */
  upstreamUrl: string | null;
  /** Default branch (main/master) */
  defaultBranch: string | null;
  /** Currently checked out branch */
  currentBranch: string | null;
  /** Current HEAD SHA */
  headSha: string | null;
  /** Has uncommitted changes */
  isDirty: boolean;
  /** Count of dirty files */
  dirtyFilesCount: number | null;
  /** Snapshot of dirty state */
  dirtySnapshot: DirtySnapshot | null;
  /** Newest mtime of dirty files (ISO 8601) */
  lastFileChangeAt: string | null;
}

/**
 * Dirty file entry in snapshot.
 */
interface DirtyFileEntry {
  path: string;
  status: string;
  mtime: string | null;
}

/**
 * Snapshot of uncommitted changes.
 */
interface DirtySnapshot {
  status: string;
  files: DirtyFileEntry[];
  capturedAt: string;
}

/**
 * Execute a git command in a repository.
 * Returns null on error.
 */
function execGit(repoPath: string, args: string): string | null {
  try {
    return execSync(`git ${args}`, {
      cwd: repoPath,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Normalize git upstream URLs to a consistent format.
 *
 * Examples:
 * - git@github.com:user/repo.git -> github.com/user/repo
 * - https://github.com/user/repo.git -> github.com/user/repo
 * - https://github.com/user/repo -> github.com/user/repo
 */
export function normalizeUpstreamUrl(url: string): string {
  let normalized = url
    // git@host:path -> host/path
    .replace(/^git@([^:]+):/, "$1/")
    // Remove protocol
    .replace(/^https?:\/\//, "")
    // Remove .git suffix
    .replace(/\.git$/, "")
    // Lowercase for consistency
    .toLowerCase();

  return normalized;
}

/**
 * Recursively discover Git repositories under search paths.
 */
export async function discoverGitRepos(
  searchPaths: string[]
): Promise<GitRepoInfo[]> {
  const repos: GitRepoInfo[] = [];
  const visited = new Set<string>();

  function searchDirectory(dirPath: string, depth: number): void {
    if (depth > MAX_SEARCH_DEPTH) return;
    if (visited.has(dirPath)) return;
    visited.add(dirPath);

    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch {
      return; // Permission denied or other error
    }

    for (const entry of entries) {
      if (SKIP_DIRECTORIES.has(entry)) continue;

      const fullPath = join(dirPath, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (!stat.isDirectory()) continue;

      if (entry === ".git") {
        // This is a skip entry but we check if parent is a git repo
        continue;
      }

      // Check if this directory contains a .git folder
      const gitDir = join(fullPath, ".git");
      if (existsSync(gitDir)) {
        const info = extractGitInfo(fullPath);
        if (info) {
          repos.push(info);
        }
        // Don't recurse into git repos - they're self-contained
        continue;
      }

      // Recurse into subdirectory
      searchDirectory(fullPath, depth + 1);
    }
  }

  for (const searchPath of searchPaths) {
    if (!existsSync(searchPath)) continue;

    // Check if search path itself is a git repo
    const gitDir = join(searchPath, ".git");
    if (existsSync(gitDir)) {
      const info = extractGitInfo(searchPath);
      if (info) {
        repos.push(info);
      }
      continue;
    }

    searchDirectory(searchPath, 0);
  }

  return repos;
}

/**
 * Extract Git repository information.
 */
export function extractGitInfo(repoPath: string): GitRepoInfo | null {
  // Check if it's actually a git repo
  const headSha = execGit(repoPath, "rev-parse HEAD");
  if (headSha === null) return null;

  // Get origin URL
  const originUrl = execGit(repoPath, "remote get-url origin");
  const upstreamUrl = originUrl ? normalizeUpstreamUrl(originUrl) : null;

  // Get current branch
  const currentBranch = execGit(repoPath, "branch --show-current");

  // Get default branch
  let defaultBranch = execGit(
    repoPath,
    "symbolic-ref refs/remotes/origin/HEAD"
  );
  if (defaultBranch) {
    // Extract branch name from refs/remotes/origin/main -> main
    defaultBranch = defaultBranch.replace(/^refs\/remotes\/origin\//, "");
  } else {
    // Fallback: check if main or master exists
    const branches = execGit(repoPath, "branch -a");
    if (branches?.includes("main")) {
      defaultBranch = "main";
    } else if (branches?.includes("master")) {
      defaultBranch = "master";
    } else {
      defaultBranch = null;
    }
  }

  // Get dirty status
  const statusOutput = execGit(repoPath, "status --porcelain") ?? "";
  const isDirty = statusOutput.length > 0;
  const dirtyLines = statusOutput
    .split("\n")
    .filter((line) => line.length > 0);
  const dirtyFilesCount = isDirty ? dirtyLines.length : 0;

  // Build dirty snapshot
  let dirtySnapshot: DirtySnapshot | null = null;
  if (isDirty) {
    const files: DirtyFileEntry[] = dirtyLines.map((line) => {
      // Format: XY filename or XY -> renamed
      const status = line.substring(0, 2).trim();
      let filePath = line.substring(3);
      // Handle renamed files: "R  old -> new"
      if (filePath.includes(" -> ")) {
        filePath = filePath.split(" -> ")[1];
      }

      // Try to get mtime
      let mtime: string | null = null;
      try {
        const fullFilePath = join(repoPath, filePath);
        if (existsSync(fullFilePath)) {
          const fileStat = statSync(fullFilePath);
          mtime = fileStat.mtime.toISOString();
        }
      } catch {
        // File might not exist (deleted)
      }

      return { path: filePath, status, mtime };
    });

    dirtySnapshot = {
      status: statusOutput,
      files,
      capturedAt: new Date().toISOString(),
    };
  }

  // Get newest mtime from dirty files
  let lastFileChangeAt: string | null = null;
  if (dirtySnapshot) {
    const mtimes = dirtySnapshot.files
      .map((f) => f.mtime)
      .filter((m): m is string => m !== null)
      .sort()
      .reverse();
    if (mtimes.length > 0) {
      lastFileChangeAt = mtimes[0];
    }
  }

  return {
    path: repoPath,
    upstreamUrl,
    defaultBranch,
    currentBranch,
    headSha,
    isDirty,
    dirtyFilesCount,
    dirtySnapshot,
    lastFileChangeAt,
  };
}

/**
 * Extract all branches from a repository.
 */
export async function extractBranches(repoPath: string): Promise<GitBranch[]> {
  const output = execGit(
    repoPath,
    "for-each-ref --format='%(refname:short)|%(upstream:short)|%(upstream:track)' refs/heads/"
  );

  if (!output) return [];

  const branches: GitBranch[] = [];

  for (const line of output.split("\n")) {
    if (!line) continue;

    // Remove surrounding quotes if present
    const cleanLine = line.replace(/^'|'$/g, "");
    const parts = cleanLine.split("|");
    const name = parts[0];
    const upstreamName = parts[1] || null;
    const track = parts[2] || "";

    if (!name) continue;

    // Get head SHA for this branch
    const headSha = execGit(repoPath, `rev-parse ${name}`);
    if (!headSha) continue;

    // Get upstream SHA
    let upstreamSha: string | null = null;
    if (upstreamName) {
      upstreamSha = execGit(repoPath, `rev-parse ${upstreamName}`);
    }

    // Parse ahead/behind from track string like "[ahead 2, behind 1]"
    let aheadCount = 0;
    let behindCount = 0;
    const aheadMatch = track.match(/ahead (\d+)/);
    const behindMatch = track.match(/behind (\d+)/);
    if (aheadMatch) {
      aheadCount = parseInt(aheadMatch[1], 10);
    }
    if (behindMatch) {
      behindCount = parseInt(behindMatch[1], 10);
    }

    // Get last commit timestamp
    const lastCommitAt = execGit(repoPath, `log -1 --format=%aI ${name}`);

    branches.push({
      name,
      headSha,
      upstreamName: upstreamName || null,
      upstreamSha,
      aheadCount,
      behindCount,
      lastCommitAt: lastCommitAt || null,
    });
  }

  return branches;
}

/**
 * Validate and normalize an ISO 8601 datetime string.
 * Returns the normalized string or null if invalid.
 */
function normalizeDateTime(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  // Try to parse the date
  const parsed = Date.parse(dateStr);
  if (isNaN(parsed)) {
    return null;
  }

  // Return as proper ISO 8601 format
  return new Date(parsed).toISOString();
}

/**
 * Extract commits from a repository, excluding known SHAs.
 */
export async function extractCommits(
  repoPath: string,
  knownShas: Set<string>,
  limit: number = 1000
): Promise<GitCommit[]> {
  // Format: SHA|subject|authorName|authorEmail|authorDate|committerName|committerDate|parents
  const format = "%H|%s|%an|%ae|%aI|%cn|%cI|%P";
  const output = execGit(repoPath, `log --all --format="${format}" -n ${limit}`);

  if (!output) return [];

  const commits: GitCommit[] = [];

  for (const line of output.split("\n")) {
    if (!line) continue;

    // Split by | but message might contain |
    const parts = line.split("|");
    if (parts.length < 7) continue;

    const sha = parts[0];
    const message = parts[1];
    const authorName = parts[2];
    const authorEmail = parts[3];
    const authorDateRaw = parts[4];
    const committerName = parts[5];
    const committerDateRaw = parts[6];
    const parentShas = parts[7] ? parts[7].split(" ").filter(Boolean) : [];

    // Skip if we already know this commit
    if (knownShas.has(sha)) continue;

    // Validate and normalize dates
    const authorDate = normalizeDateTime(authorDateRaw);
    const committerDate = normalizeDateTime(committerDateRaw);

    // Skip commits with invalid author date (required field)
    if (!authorDate) {
      continue;
    }

    commits.push({
      sha,
      message,
      authorName,
      authorEmail,
      authorDate,
      committerName: committerName || null,
      committerDate,
      parentShas,
    });
  }

  return commits;
}

/**
 * Parse git log output into commits.
 * Exported for testing.
 */
export function parseGitLogOutput(
  output: string,
  knownShas: Set<string>
): GitCommit[] {
  const commits: GitCommit[] = [];

  for (const line of output.split("\n")) {
    if (!line) continue;

    const parts = line.split("|");
    if (parts.length < 7) continue;

    const sha = parts[0];
    const message = parts[1];
    const authorName = parts[2];
    const authorEmail = parts[3];
    const authorDateRaw = parts[4];
    const committerName = parts[5];
    const committerDateRaw = parts[6];
    const parentShas = parts[7] ? parts[7].split(" ").filter(Boolean) : [];

    if (knownShas.has(sha)) continue;

    // Validate and normalize dates
    const authorDate = normalizeDateTime(authorDateRaw);
    const committerDate = normalizeDateTime(committerDateRaw);

    // Skip commits with invalid author date (required field)
    if (!authorDate) {
      continue;
    }

    commits.push({
      sha,
      message,
      authorName,
      authorEmail,
      authorDate,
      committerName: committerName || null,
      committerDate,
      parentShas,
    });
  }

  return commits;
}

/**
 * Parse git for-each-ref output into branches.
 * Exported for testing.
 */
export function parseBranchOutput(
  output: string,
  branchShas: Map<string, string>,
  upstreamShas: Map<string, string>,
  branchCommitDates: Map<string, string>
): GitBranch[] {
  const branches: GitBranch[] = [];

  for (const line of output.split("\n")) {
    if (!line) continue;

    const cleanLine = line.replace(/^'|'$/g, "");
    const parts = cleanLine.split("|");
    const name = parts[0];
    const upstreamName = parts[1] || null;
    const track = parts[2] || "";

    if (!name) continue;

    const headSha = branchShas.get(name);
    if (!headSha) continue;

    const upstreamSha = upstreamName ? (upstreamShas.get(upstreamName) ?? null) : null;

    let aheadCount = 0;
    let behindCount = 0;
    const aheadMatch = track.match(/ahead (\d+)/);
    const behindMatch = track.match(/behind (\d+)/);
    if (aheadMatch) {
      aheadCount = parseInt(aheadMatch[1], 10);
    }
    if (behindMatch) {
      behindCount = parseInt(behindMatch[1], 10);
    }

    const lastCommitAt = branchCommitDates.get(name) ?? null;

    branches.push({
      name,
      headSha,
      upstreamName: upstreamName || null,
      upstreamSha,
      aheadCount,
      behindCount,
      lastCommitAt,
    });
  }

  return branches;
}

/**
 * Build a complete sync payload for a Git repository.
 */
export function buildSyncGitRepo(
  info: GitRepoInfo,
  branches: GitBranch[],
  commits: GitCommit[]
): SyncGitRepo {
  return {
    host: getEffectiveHostname(),
    path: info.path,
    upstreamUrl: info.upstreamUrl,
    defaultBranch: info.defaultBranch,
    currentBranch: info.currentBranch,
    headSha: info.headSha,
    isDirty: info.isDirty,
    dirtyFilesCount: info.dirtyFilesCount,
    dirtySnapshot: info.dirtySnapshot as Record<string, unknown> | null,
    lastFileChangeAt: info.lastFileChangeAt,
    branches,
    commits,
  };
}
