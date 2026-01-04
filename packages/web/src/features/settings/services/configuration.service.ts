import type { ApiClient } from "@/core/api";
import type { Configuration, ConfigurationUpdateInput } from "../types/configuration";

export class ConfigurationService {
  constructor(private api: ApiClient) {}

  /**
   * List configurations by category
   */
  async listByCategory(category: string): Promise<Configuration[]> {
    return this.api.get<Configuration[]>("/api/configuration", { category });
  }

  /**
   * Get a single configuration value
   */
  async get(category: string, key: string): Promise<Configuration> {
    return this.api.get<Configuration>(`/api/configuration/${category}/${key}`);
  }

  /**
   * Update a configuration value
   */
  async update(
    category: string,
    key: string,
    data: ConfigurationUpdateInput
  ): Promise<Configuration> {
    return this.api.put<Configuration>(`/api/configuration/${category}/${key}`, data);
  }
}
