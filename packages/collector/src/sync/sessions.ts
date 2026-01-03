/**
 * Session sync module.
 * Discovers Claude sessions and builds sync payloads for the server.
 */

import { join } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { getEffectiveHostname } from "../utils/hostname.js";
import {
  listProjects,
  type ProjectInfo,
  type SessionFile,
} from "@claude-archive/parser";
import type {
  SyncWorkspace,
  SyncSession,
  SyncEntry,
  SyncToolResult,
} from "../api/types.js";
import { loadToolResult } from "./tool-results.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Known state for a session, used for delta sync.
 */
export interface SessionState {
  originalSessionId: string;
  entryCount: number;
  lastLineNumber: number;
}

// =============================================================================
// Discovery
// =============================================================================

/**
 * Discover all Claude workspaces (projects) on this host.
 */
export async function discoverWorkspaces(): Promise<ProjectInfo[]> {
  return listProjects();
}

// =============================================================================
// Workspace Building
// =============================================================================

/**
 * Extract the real cwd from a JSONL session file.
 * Looks for the first entry with a cwd field (usually user entries).
 */
export async function extractCwdFromSession(
  sessionPath: string
): Promise<string | null> {
  try {
    const content = await readFile(sessionPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.cwd && typeof parsed.cwd === "string") {
          return parsed.cwd;
        }
      } catch {
        continue;
      }
    }
  } catch {
    // File not readable
  }
  return null;
}

/**
 * Build a sync workspace payload for a project.
 *
 * @param project - The project info from the parser
 * @param knownSessionState - Map of session IDs to their known state
 * @returns A workspace payload with sessions that have new entries
 */
export async function buildSyncWorkspace(
  project: ProjectInfo,
  knownSessionState: Map<string, SessionState>
): Promise<SyncWorkspace> {
  const sessions: SyncSession[] = [];

  // Try to extract real cwd from session entries (more reliable than decoded path)
  let realCwd: string | null = null;
  for (const sessionFile of project.sessions) {
    realCwd = await extractCwdFromSession(sessionFile.path);
    if (realCwd) break;
  }

  for (const sessionFile of project.sessions) {
    const sessionId = sessionFile.sessionId;
    const knownState = knownSessionState.get(sessionId);

    const syncSession = await buildSyncSession(
      project.claudePath,
      sessionFile,
      knownState
    );

    if (syncSession !== null) {
      sessions.push(syncSession);
    }
  }

  return {
    host: getEffectiveHostname(),
    cwd: realCwd || project.originalPath, // Use real cwd if found, fallback to decoded
    claudeProjectPath: project.claudePath,
    sessions,
  };
}

// =============================================================================
// Session Building
// =============================================================================

/**
 * Build a sync session payload from a session file.
 *
 * @param projectDir - Path to the Claude project directory
 * @param sessionFile - The session file info
 * @param knownState - Known state for delta sync, or undefined for full sync
 * @returns A session payload with new entries, or null if no new entries
 */
export async function buildSyncSession(
  projectDir: string,
  sessionFile: SessionFile,
  knownState: SessionState | undefined
): Promise<SyncSession | null> {
  const filePath = sessionFile.path;
  const startLine = knownState ? knownState.lastLineNumber + 1 : 1;

  // Get file creation time (birthtime) as fallback for session timestamps
  let fileCreatedAt: Date;
  let fileStat;
  try {
    fileStat = await stat(filePath);
    // Use birthtime if available, otherwise fall back to mtime
    fileCreatedAt = fileStat.birthtime.getTime() > 0 ? fileStat.birthtime : fileStat.mtime;
  } catch {
    return null;
  }

  // Read the file once
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch {
    return null;
  }

  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  // Quick check: if we have known state and no new lines, skip
  if (knownState) {
    if (lines.length <= knownState.lastLineNumber) {
      // No new lines - skip silently
      return null;
    }
    // Log that we found new entries
    console.log(`[delta] Session ${sessionFile.sessionId.slice(0,8)}...: file has ${lines.length} lines, server knows ${knownState.lastLineNumber} -> syncing ${lines.length - knownState.lastLineNumber} new entries`);
  } else {
    console.log(`[delta] Session ${sessionFile.sessionId.slice(0,8)}...: no known state, syncing all ${lines.length} entries`);
  }
  const entries: SyncEntry[] = [];
  let parentOriginalSessionId: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1; // 1-indexed
    const line = lines[i];

    // For agent sessions, extract parent session ID from first entry
    if (sessionFile.isAgent && i === 0) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.sessionId && typeof parsed.sessionId === "string") {
          parentOriginalSessionId = parsed.sessionId;
        }
      } catch {
        // Ignore parse errors for parent extraction
      }
    }

    // Skip lines we've already processed
    if (lineNumber < startLine) {
      continue;
    }

    try {
      const parsed = JSON.parse(line);

      // Extract timestamp from different entry types
      // Most entries: data.timestamp
      // file-history-snapshot: data.snapshot.timestamp
      let timestamp: string | null = parsed.timestamp || null;
      if (!timestamp && parsed.type === "file-history-snapshot" && parsed.snapshot?.timestamp) {
        timestamp = parsed.snapshot.timestamp;
      }

      const entry: SyncEntry = {
        originalUuid: parsed.uuid || null,
        lineNumber,
        type: parsed.type || "unknown",
        subtype: parsed.subtype || null,
        timestamp,
        data: parsed,
      };
      entries.push(entry);
    } catch {
      // Skip malformed lines
      continue;
    }
  }

  // No new entries
  if (entries.length === 0) {
    return null;
  }

  // Load tool results for new entries
  const toolResults = await loadToolResultsForSession(
    projectDir,
    sessionFile.sessionId,
    entries
  );

  return {
    originalSessionId: sessionFile.sessionId,
    agentId: sessionFile.agentId || null,
    parentOriginalSessionId,
    filename: `${sessionFile.sessionId}.jsonl`,
    fileCreatedAt: fileCreatedAt.toISOString(),
    entries,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
  };
}

// =============================================================================
// Tool Results Loading
// =============================================================================

/**
 * Load tool results for entries in a session.
 *
 * @param projectDir - Path to the Claude project directory
 * @param sessionId - The session ID
 * @param entries - The entries to scan for tool uses
 * @returns Array of loaded tool results
 */
export async function loadToolResultsForSession(
  projectDir: string,
  sessionId: string,
  entries: SyncEntry[]
): Promise<SyncToolResult[]> {
  const toolUseIds: string[] = [];

  // Scan entries for tool_use content items
  for (const entry of entries) {
    const data = entry.data as Record<string, unknown>;

    // Check assistant messages for tool_use content
    if (data.type === "assistant" && data.message) {
      const message = data.message as Record<string, unknown>;
      const content = message.content;

      if (Array.isArray(content)) {
        for (const item of content) {
          if (
            typeof item === "object" &&
            item !== null &&
            (item as Record<string, unknown>).type === "tool_use"
          ) {
            const toolUseId = (item as Record<string, unknown>).id;
            if (typeof toolUseId === "string") {
              toolUseIds.push(toolUseId);
            }
          }
        }
      }
    }
  }

  // Load tool results
  const toolResultsDir = join(projectDir, sessionId, "tool-results");
  const results: SyncToolResult[] = [];

  for (const toolUseId of toolUseIds) {
    const result = await loadToolResult(toolResultsDir, toolUseId);
    if (result !== null) {
      results.push(result);
    }
  }

  return results;
}

// =============================================================================
// Exports for Testing
// =============================================================================

export { loadToolResult } from "./tool-results.js";
