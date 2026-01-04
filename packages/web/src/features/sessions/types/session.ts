/**
 * Session types based on API schema
 */

export interface Session {
  id: string;
  workspaceId: string;
  originalSessionId: string;
  parentSessionId: string | null;
  agentId: string | null;
  filename: string;
  firstEntryAt: string | null;
  lastEntryAt: string | null;
  entryCount: number;
  summary: string | null;
  modelsUsed: string[] | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  isEmpty: boolean;
  syncedAt: string;
  // Extended fields from list endpoint
  workspaceHost?: string;
  workspaceCwd?: string;
  projectName?: string;
  agentCount?: number;
  // Extended fields from detail endpoint
  agents?: Session[];
}

export interface SessionListResponse {
  items: Session[];
  total: number;
  limit: number;
  offset: number;
}

export type SessionSortBy = "lastEntryAt" | "entryCount" | "totalTokens";
export type SortOrder = "asc" | "desc";

export interface SessionListParams {
  limit?: number;
  offset?: number;
  workspaceId?: string;
  projectId?: string;
  mainOnly?: boolean;
  sortBy?: SessionSortBy;
  sortOrder?: SortOrder;
}

export interface Entry {
  id: string;
  sessionId: string;
  originalUuid: string | null;
  lineNumber: number;
  type: string;
  subtype: string | null;
  timestamp: string | null;
  data: Record<string, unknown>;
}

export interface EntryListResponse {
  items: Entry[];
  total: number;
  limit: number;
  offset: number;
}

export interface EntryListParams {
  limit?: number;
  offset?: number;
  type?: string;
  order?: "asc" | "desc";
}

export interface GenerateSummaryRequest {
  userInstructions?: string;
}

export interface GenerateSummaryResponse {
  summary: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}
