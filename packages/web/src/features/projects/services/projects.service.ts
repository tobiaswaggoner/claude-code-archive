import type { ApiClient } from "@/core/api";
import type {
  Project,
  ProjectListParams,
  ProjectListResponse,
  WorkspaceListResponse,
  GitCommitListResponse,
  GitCommitListParams,
} from "../types/project";
import type { ProjectUpdateInput } from "../types/project-update";

export class ProjectsService {
  constructor(private api: ApiClient) {}

  async list(params?: ProjectListParams): Promise<ProjectListResponse> {
    return this.api.get<ProjectListResponse>("/api/projects", params as Record<string, string | number | boolean | undefined>);
  }

  async get(id: string): Promise<Project> {
    return this.api.get<Project>(`/api/projects/${id}`);
  }

  async getWorkspaces(id: string): Promise<WorkspaceListResponse> {
    return this.api.get<WorkspaceListResponse>(`/api/projects/${id}/workspaces`);
  }

  /**
   * Update a project.
   */
  async update(id: string, data: ProjectUpdateInput): Promise<Project> {
    return this.api.put<Project>(`/api/projects/${id}`, data);
  }

  /**
   * Get git commits for a project.
   */
  async getCommits(
    id: string,
    params?: GitCommitListParams
  ): Promise<GitCommitListResponse> {
    return this.api.get<GitCommitListResponse>(
      `/api/projects/${id}/commits`,
      params as Record<string, string | number | boolean | undefined>
    );
  }
}
