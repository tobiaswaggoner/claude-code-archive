import type { ApiClient } from "@/core/api";
import type { ModelsResponse } from "../types/model";

export class ModelsService {
  constructor(private api: ApiClient) {}

  /**
   * List all available AI models from OpenRouter
   */
  async list(): Promise<ModelsResponse> {
    return this.api.get<ModelsResponse>("/api/models");
  }
}
