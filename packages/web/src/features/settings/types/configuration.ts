export interface Configuration {
  id: string;
  category: string;
  key: string;
  valueType: "int" | "datetime" | "text";
  value: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigurationUpdateInput {
  value: string;
  description?: string;
}

export type SummaryConfigKey =
  | "prompt_template"
  | "model"
  | "max_tokens"
  | "history_count"
  | "temperature";

export interface SummarySettings {
  prompt_template: string;
  model: string;
  max_tokens: string;
  history_count: string;
  temperature: string;
}
