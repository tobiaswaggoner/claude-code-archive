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
  lastWorkedAt: string | null;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  limit: number;
  offset: number;
}

export type ProjectSortBy = "name" | "updatedAt" | "createdAt" | "lastWorkedAt";
export type SortOrder = "asc" | "desc";

export interface ProjectListParams {
  limit?: number;
  offset?: number;
  search?: string;
  archived?: boolean;
  sortBy?: ProjectSortBy;
  sortOrder?: SortOrder;
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

export interface GitCommit {
  id: string;
  projectId: string;
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  committerName: string | null;
  committerDate: string | null;
  parentShas: string[] | null;
}

export interface GitCommitListResponse {
  items: GitCommit[];
  total: number;
  limit: number;
  offset: number;
}

export interface GitCommitListParams {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  sortOrder?: SortOrder;
}
