import type { ApiClient } from "@/core/api";
import type {
  Project,
  ProjectListParams,
  ProjectListResponse,
  WorkspaceListResponse,
} from "../types/project";

export class ProjectsService {
  constructor(private api: ApiClient) {}

  async list(params?: ProjectListParams): Promise<ProjectListResponse> {
    return this.api.get<ProjectListResponse>("/api/projects", params);
  }

  async get(id: string): Promise<Project> {
    return this.api.get<Project>(`/api/projects/${id}`);
  }

  async getWorkspaces(id: string): Promise<WorkspaceListResponse> {
    return this.api.get<WorkspaceListResponse>(`/api/projects/${id}/workspaces`);
  }
}
