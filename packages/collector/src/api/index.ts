/**
 * API client module for collector-to-server communication.
 */

export { ApiClient, ApiError } from "./client.js";
export type {
  // Registration
  RegisterRequest,
  RegisterResponse,
  // Heartbeat
  HeartbeatRequest,
  // Session state
  SessionStateItem,
  SessionStateResponse,
  // Commit state
  CommitStateResponse,
  // Git sync
  GitBranch,
  GitCommit,
  SyncGitRepo,
  // Workspace sync
  SyncEntry,
  SyncToolResult,
  SyncSession,
  SyncWorkspace,
  // Sync request/response
  SyncRequest,
  SyncResponse,
  // Logs
  LogLevel,
  LogEntry,
  SubmitLogsResponse,
  // Errors
  ErrorResponse,
} from "./types.js";
