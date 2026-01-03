/**
 * API types for collector-to-server communication.
 * These mirror the server's request/response types from packages/server/src/routes/schemas.ts
 */

// =============================================================================
// Collector Registration
// =============================================================================

export interface RegisterRequest {
  id: string;
  name: string;
  hostname: string;
  osInfo?: string;
  version?: string;
  config?: Record<string, unknown>;
}

export interface RegisterResponse {
  id: string;
  name: string;
  hostname: string;
  osInfo: string | null;
  version: string | null;
  config: Record<string, unknown> | null;
  registeredAt: string;
  lastSeenAt: string;
  lastSyncRunId: string | null;
  lastSyncStatus: "success" | "error" | "partial" | null;
  isActive: boolean;
}

// =============================================================================
// Heartbeat
// =============================================================================

export interface HeartbeatRequest {
  syncRunId?: string;
  syncStatus?: "success" | "error" | "partial";
}

// =============================================================================
// Session State (for delta sync)
// =============================================================================

export interface SessionStateItem {
  originalSessionId: string;
  entryCount: number;
  lastLineNumber: number;
}

export interface SessionStateResponse {
  sessions: SessionStateItem[];
}

// =============================================================================
// Commit State (for delta sync)
// =============================================================================

export interface CommitStateResponse {
  knownShas: string[];
}

// =============================================================================
// Git Sync Types
// =============================================================================

export interface GitBranch {
  name: string;
  headSha: string;
  upstreamName?: string | null;
  upstreamSha?: string | null;
  aheadCount?: number;
  behindCount?: number;
  lastCommitAt?: string | null;
}

export interface GitCommit {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  committerName?: string | null;
  committerDate?: string | null;
  parentShas?: string[] | null;
}

export interface SyncGitRepo {
  host: string;
  path: string;
  upstreamUrl?: string | null;
  defaultBranch?: string | null;
  currentBranch?: string | null;
  headSha?: string | null;
  isDirty: boolean;
  dirtyFilesCount?: number | null;
  dirtySnapshot?: Record<string, unknown> | null;
  lastFileChangeAt?: string | null;
  branches: GitBranch[];
  commits: GitCommit[];
}

// =============================================================================
// Workspace Sync Types
// =============================================================================

export interface SyncEntry {
  originalUuid?: string | null;
  lineNumber: number;
  type: string;
  subtype?: string | null;
  timestamp?: string | null;
  data: Record<string, unknown>;
}

export interface SyncToolResult {
  toolUseId: string;
  toolName: string;
  contentType: string;
  contentText?: string | null;
  contentBinary?: string | null; // Base64 encoded
  sizeBytes: number;
  isError: boolean;
}

export interface SyncSession {
  originalSessionId: string;
  agentId?: string | null;
  parentOriginalSessionId?: string | null;
  filename: string;
  fileCreatedAt: string; // ISO timestamp - file creation date as fallback for session timestamps
  entries: SyncEntry[];
  toolResults?: SyncToolResult[];
}

export interface SyncWorkspace {
  host: string;
  cwd: string;
  claudeProjectPath: string;
  sessions: SyncSession[];
}

// =============================================================================
// Sync Request/Response
// =============================================================================

export interface SyncRequest {
  syncRunId: string;
  gitRepos?: SyncGitRepo[];
  workspaces?: SyncWorkspace[];
}

export interface SyncResponse {
  projectsCreated: number;
  projectsUpdated: number;
  gitReposCreated: number;
  gitReposUpdated: number;
  workspacesCreated: number;
  workspacesUpdated: number;
  sessionsCreated: number;
  sessionsUpdated: number;
  entriesCreated: number;
  commitsCreated: number;
  branchesCreated: number;
  branchesUpdated: number;
}

// =============================================================================
// Run Logs
// =============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  syncRunId: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export interface SubmitLogsResponse {
  count: number;
}

// =============================================================================
// Error Response
// =============================================================================

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: Array<{ path: string; message: string }>;
}
