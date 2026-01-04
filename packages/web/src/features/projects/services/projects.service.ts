import type { ApiClient } from "@/core/api";
import type {
  Project,
  ProjectListParams,
  ProjectListResponse,
  WorkspaceListResponse,
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
   * NOTE: Currently mocked - API endpoint not yet implemented.
   */
  async update(id: string, data: ProjectUpdateInput): Promise<Project> {
    // TODO: Replace with real API call when available
    // return this.api.put<Project>(`/api/projects/${id}`, data);

    console.warn("[ProjectsService] PUT /api/projects/{id} is mocked");

    // Mock: fetch current and merge with updates
    const current = await this.get(id);
    const updated: Project = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return updated;
  }
}
