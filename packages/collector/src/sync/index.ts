/**
 * Sync orchestration module.
 * Coordinates git repository and Claude session synchronization.
 */

import { randomUUID } from "node:crypto";
import { release, platform } from "node:os";
import { getEffectiveHostname } from "../utils/hostname.js";
import type { Config } from "../config.js";
import type { CliArgs } from "../cli.js";
import { ApiClient, ApiError } from "../api/client.js";
import { getOrCreateCollectorId } from "../collector-id.js";
import { Logger } from "../lib/logger.js";
import {
  discoverGitRepos,
  extractBranches,
  extractCommits,
  buildSyncGitRepo,
} from "./git.js";
import { discoverWorkspaces, buildSyncWorkspace, extractCwdFromSession, type SessionState } from "./sessions.js";
import type { SyncRequest, SyncGitRepo, SyncWorkspace } from "../api/types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a sync run.
 */
export interface SyncResult {
  syncRunId: string;
  gitReposProcessed: number;
  gitReposSynced: number;
  commitsFound: number;
  workspacesProcessed: number;
  workspacesSynced: number;
  sessionsFound: number;
  entriesFound: number;
  errors: string[];
  dryRun: boolean;
}

// =============================================================================
// Constants (exported for testing)
// =============================================================================

/** Retry configuration - exported so tests can override */
export const retryConfig = {
  maxRetries: 3,
  delayMs: 1000,
};

/** Maximum sessions per request to avoid server heap overflow */
export const SESSION_BATCH_SIZE = 50;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | undefined;
  const { maxRetries, delayMs } = retryConfig;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on 4xx errors (client errors)
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        await sleep(delayMs * attempt);
      }
    }
  }

  throw lastError;
}

// =============================================================================
// Main Sync Function
// =============================================================================

/**
 * Run the sync process.
 *
 * @param config - The collector configuration
 * @param args - CLI arguments
 * @returns The sync result with statistics and errors
 */
export async function runSync(config: Config, args: CliArgs): Promise<SyncResult> {
  // Initialize
  const logger = new Logger(args.verbose ? "debug" : config.logLevel);
  const client = new ApiClient(config);
  const syncRunId = randomUUID();
  const collectorId = getOrCreateCollectorId();
  const host = getEffectiveHostname();

  const result: SyncResult = {
    syncRunId,
    gitReposProcessed: 0,
    gitReposSynced: 0,
    commitsFound: 0,
    workspacesProcessed: 0,
    workspacesSynced: 0,
    sessionsFound: 0,
    entriesFound: 0,
    errors: [],
    dryRun: args.dryRun,
  };

  // Collected sync data
  const gitRepos: SyncGitRepo[] = [];
  const workspaces: SyncWorkspace[] = [];

  // ==========================================================================
  // Step 1: Register with Server
  // ==========================================================================
  if (!args.dryRun) {
    try {
      logger.info("Registering collector...");
      await withRetry(() =>
        client.register({
          id: collectorId,
          name: config.collectorName,
          hostname: host,
          osInfo: `${platform()} ${release()}`,
          version: "1.0.0",
        })
      );
      logger.info(`Registered as ${collectorId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown registration error";
      logger.error(`Failed to register: ${message}`);
      result.errors.push(`Registration failed: ${message}`);
      // Continue with sync attempt
    }
  } else {
    logger.info("[DRY RUN] Would register collector");
  }

  // ==========================================================================
  // Step 2: Send Initial Heartbeat
  // ==========================================================================
  if (!args.dryRun) {
    try {
      await withRetry(() => client.heartbeat(collectorId, { syncRunId }));
      logger.debug("Sent initial heartbeat");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown heartbeat error";
      logger.warn(`Failed to send initial heartbeat: ${message}`);
      // Non-fatal, continue
    }
  }

  // ==========================================================================
  // Step 2.5: Fetch Complete Sync State (single API call for delta sync)
  // ==========================================================================
  // Maps to store known state from server (populated in non-dry-run mode)
  const knownCommitsByPath = new Map<string, Set<string>>();
  const knownSessionsByPath = new Map<string, Map<string, SessionState>>();

  if (!args.dryRun) {
    try {
      logger.info("Fetching sync state from server...");
      const syncState = await withRetry(() => client.getSyncState(collectorId, host));

      // Populate git repo commit state
      for (const [path, shas] of Object.entries(syncState.gitRepos)) {
        knownCommitsByPath.set(path, new Set(shas));
      }

      // Populate workspace session state
      for (const [cwd, sessions] of Object.entries(syncState.workspaces)) {
        const sessionMap = new Map<string, SessionState>();
        for (const session of sessions) {
          sessionMap.set(session.originalSessionId, {
            originalSessionId: session.originalSessionId,
            entryCount: session.entryCount,
            lastLineNumber: session.lastLineNumber,
          });
        }
        knownSessionsByPath.set(cwd, sessionMap);
      }

      logger.info(
        `Server state: ${knownCommitsByPath.size} git repos, ${knownSessionsByPath.size} workspaces`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error fetching sync state";
      logger.warn(`Could not fetch sync state: ${message}, will sync all data`);
      // Non-fatal, continue with empty state (will sync everything)
    }
  }

  // ==========================================================================
  // Step 3: Git Repository Sync
  // ==========================================================================
  if (args.sourceDirs.length > 0) {
    logger.info(
      `Discovering Git repositories in ${args.sourceDirs.length} directories...`
    );

    try {
      const repos = await discoverGitRepos(args.sourceDirs);
      logger.info(`Found ${repos.length} Git repositories`);

      for (const repo of repos) {
        result.gitReposProcessed++;
        logger.debug(`Processing ${repo.path}...`);

        try {
          // Get known commit SHAs from cached state (fetched in single API call)
          const knownShas = knownCommitsByPath.get(repo.path) ?? new Set<string>();
          if (knownShas.size > 0) {
            logger.debug(`Server knows ${knownShas.size} commits for ${repo.path}`);
          }

          // Extract branches and commits
          const branches = await extractBranches(repo.path);
          const commits = await extractCommits(repo.path, knownShas);

          // Only include repos that have NEW commits to sync
          // (branches are always present, so we can't use that as a change indicator)
          if (commits.length > 0) {
            const syncRepo = buildSyncGitRepo(repo, branches, commits);
            gitRepos.push(syncRepo);
            result.gitReposSynced++;
            result.commitsFound += commits.length;
            logger.debug(
              `Repo ${repo.path}: ${branches.length} branches, ${commits.length} new commits`
            );
          } else {
            logger.debug(`Repo ${repo.path}: no new commits, skipping`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error(`Error processing ${repo.path}: ${message}`);
          result.errors.push(`Git repo ${repo.path}: ${message}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error discovering git repos: ${message}`);
      result.errors.push(`Git discovery: ${message}`);
    }
  } else {
    logger.debug("No source directories specified, skipping Git sync");
  }

  // ==========================================================================
  // Step 4: Claude Session Sync
  // ==========================================================================
  logger.info("Discovering Claude workspaces...");

  try {
    const projects = await discoverWorkspaces();
    logger.info(`Found ${projects.length} workspaces`);

    for (const project of projects) {
      result.workspacesProcessed++;

      try {
        // First, extract the real cwd from JSONL files (more reliable than decoded path)
        let realCwd: string | null = null;
        for (const sessionFile of project.sessions) {
          realCwd = await extractCwdFromSession(sessionFile.path);
          if (realCwd) break;
        }
        const workspaceCwd = realCwd || project.originalPath;

        logger.debug(`Processing workspace ${workspaceCwd}...`);

        // Get session state from cached state (fetched in single API call)
        const knownSessionState = knownSessionsByPath.get(workspaceCwd) ?? new Map<string, SessionState>();
        if (knownSessionState.size > 0) {
          logger.debug(`Server knows ${knownSessionState.size} sessions for ${workspaceCwd}`);
        }

        // Build sync workspace with delta entries
        const workspace = await buildSyncWorkspace(project, knownSessionState);

        // Only include workspaces with new sessions/entries
        if (workspace.sessions.length > 0) {
          workspaces.push(workspace);
          result.workspacesSynced++;
          result.sessionsFound += workspace.sessions.length;

          // Count entries
          for (const session of workspace.sessions) {
            result.entriesFound += session.entries.length;
          }

          logger.debug(
            `Workspace ${project.originalPath}: ${workspace.sessions.length} sessions with new entries`
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Error processing workspace ${project.originalPath}: ${message}`);
        result.errors.push(`Workspace ${project.originalPath}: ${message}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error discovering workspaces: ${message}`);
    result.errors.push(`Workspace discovery: ${message}`);
  }

  // ==========================================================================
  // Step 5: Send Sync Data (in batches to avoid payload size limits)
  // ==========================================================================
  if (!args.dryRun) {
    // Only send if we have data to sync
    if (gitRepos.length > 0 || workspaces.length > 0) {
      logger.info("Sending sync data in batches...");

      let totalEntriesCreated = 0;
      let totalCommitsCreated = 0;
      let batchErrors = 0;

      // Send git repos in batches of 10
      const GIT_BATCH_SIZE = 10;
      for (let i = 0; i < gitRepos.length; i += GIT_BATCH_SIZE) {
        const batch = gitRepos.slice(i, i + GIT_BATCH_SIZE);
        const batchNum = Math.floor(i / GIT_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(gitRepos.length / GIT_BATCH_SIZE);
        const repoPaths = batch.map((r) => r.path).join(", ");

        logger.debug(`Sending git repos batch ${batchNum}/${totalBatches} (${batch.length} repos)...`);

        try {
          const response = await withRetry(() =>
            client.sync(collectorId, { syncRunId, gitRepos: batch })
          );
          totalCommitsCreated += response.commitsCreated;
        } catch (error) {
          let message = error instanceof Error ? error.message : String(error);
          // Include API error body details if available
          if (error instanceof ApiError && error.body) {
            const bodyStr = typeof error.body === "object"
              ? JSON.stringify(error.body, null, 2)
              : String(error.body);
            message += `\n  Response: ${bodyStr}`;
          }
          logger.error(`Failed to sync git batch ${batchNum}: ${message}`);
          logger.error(`  Repos in batch: ${repoPaths}`);
          result.errors.push(`Git batch ${batchNum}: ${message}`);
          batchErrors++;
        }
      }

      // Send each workspace individually, chunking large workspaces to avoid heap overflow
      for (let i = 0; i < workspaces.length; i++) {
        const ws = workspaces[i];
        const totalSessions = ws.sessions.length;
        const totalEntries = ws.sessions.reduce((sum, s) => sum + s.entries.length, 0);

        // Chunk large workspaces into batches of SESSION_BATCH_SIZE
        const numChunks = Math.ceil(totalSessions / SESSION_BATCH_SIZE);

        for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
          const startIdx = chunkIdx * SESSION_BATCH_SIZE;
          const endIdx = Math.min(startIdx + SESSION_BATCH_SIZE, totalSessions);
          const sessionChunk = ws.sessions.slice(startIdx, endIdx);
          const chunkEntryCount = sessionChunk.reduce((sum, s) => sum + s.entries.length, 0);

          // Build chunk workspace with same metadata but subset of sessions
          const chunkWorkspace: SyncWorkspace = {
            host: ws.host,
            cwd: ws.cwd,
            claudeProjectPath: ws.claudeProjectPath,
            sessions: sessionChunk,
          };

          const logPrefix = numChunks > 1
            ? `Sending workspace ${i + 1}/${workspaces.length}: ${ws.cwd} (chunk ${chunkIdx + 1}/${numChunks}, ${sessionChunk.length} sessions, ${chunkEntryCount} entries)...`
            : `Sending workspace ${i + 1}/${workspaces.length}: ${ws.cwd} (${totalSessions} sessions, ${totalEntries} entries)...`;

          logger.debug(logPrefix);

          try {
            const response = await withRetry(() =>
              client.sync(collectorId, { syncRunId, workspaces: [chunkWorkspace] })
            );
            totalEntriesCreated += response.entriesCreated;
          } catch (error) {
            let message = error instanceof Error ? error.message : String(error);
            // Include API error body details if available
            if (error instanceof ApiError && error.body) {
              const bodyStr = typeof error.body === "object"
                ? JSON.stringify(error.body, null, 2)
                : String(error.body);
              message += `\n  Response: ${bodyStr}`;
            }
            const errorSuffix = numChunks > 1 ? ` (chunk ${chunkIdx + 1}/${numChunks})` : "";
            logger.error(`Failed to sync workspace ${ws.cwd}${errorSuffix}: ${message}`);
            result.errors.push(`Workspace ${ws.cwd}${errorSuffix}: ${message}`);
            batchErrors++;
          }
        }
      }

      logger.info(
        `Sync complete: ${totalEntriesCreated} entries created, ${totalCommitsCreated} commits created`
      );

      // Send final heartbeat
      try {
        const status = batchErrors > 0
          ? (batchErrors < gitRepos.length + workspaces.length ? "partial" : "error")
          : "success";
        await client.heartbeat(collectorId, { syncRunId, syncStatus: status });
      } catch {
        // Ignore heartbeat errors
      }
    } else {
      logger.info("No changes to sync");

      // Send heartbeat indicating no changes
      try {
        await client.heartbeat(collectorId, {
          syncRunId,
          syncStatus: "success",
        });
      } catch {
        // Ignore heartbeat errors
      }
    }
  } else {
    logger.info("[DRY RUN] Would send sync data:");
    logger.info(`  Git repos: ${gitRepos.length}`);
    logger.info(`  Workspaces: ${workspaces.length}`);
    logger.info(`  Sessions: ${result.sessionsFound}`);
    logger.info(`  Entries: ${result.entriesFound}`);
    logger.info(`  Commits: ${result.commitsFound}`);
  }

  return result;
}
