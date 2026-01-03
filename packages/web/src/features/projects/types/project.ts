/**
 * Project types based on API schema
 */

export interface Project {
  id: string;
  name: string;
  upstreamUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  gitRepoCount: number;
  workspaceCount: number;
  sessionCount: number;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProjectListParams {
  limit?: number;
  offset?: number;
  search?: string;
  archived?: boolean;
}

export interface Workspace {
  id: string;
  projectId: string;
  host: string;
  cwd: string;
  claudeProjectPath: string;
  gitRepoId: string | null;
  firstSeenAt: string;
  lastSyncedAt: string;
  sessionCount: number;
}

export interface WorkspaceListResponse {
  items: Workspace[];
}
