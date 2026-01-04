import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { loadConfig } from "../../lib/config.js";
import { SummaryRepository } from "./repository.js";
import { OpenRouterClient } from "./openrouter-client.js";
import { ContentExtractor } from "./content-extractor.js";
import { PromptBuilder } from "./prompt-builder.js";
import { SummaryGenerator } from "./generator.js";
import type { ISummaryGenerator } from "./types.js";

// Re-export types
export type {
  ISummaryGenerator,
  ISummaryRepository,
  ILLMClient,
  IContentExtractor,
  IPromptBuilder,
  GenerateSummaryOptions,
  SummaryResult,
  SessionWithContext,
  ExtractedMessage,
  PromptContext,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
} from "./types.js";

// Re-export implementations for testing
export { SummaryRepository } from "./repository.js";
export { OpenRouterClient } from "./openrouter-client.js";
export { ContentExtractor } from "./content-extractor.js";
export { PromptBuilder } from "./prompt-builder.js";
export { SummaryGenerator } from "./generator.js";

/**
 * Creates a configured SummaryGenerator instance.
 *
 * @throws Error if OpenRouter is not configured
 */
export function createSummaryGenerator(db: PostgresJsDatabase): ISummaryGenerator {
  const config = loadConfig();

  if (!config.openRouterApiUrl || !config.openRouterApiKey) {
    throw new Error(
      "OpenRouter not configured. Set OPENROUTER_API_URL and OPENROUTER_API_KEY environment variables."
    );
  }

  const repository = new SummaryRepository(db);
  const llmClient = new OpenRouterClient({
    apiUrl: config.openRouterApiUrl,
    apiKey: config.openRouterApiKey,
  });
  const contentExtractor = new ContentExtractor();
  const promptBuilder = new PromptBuilder();

  return new SummaryGenerator(
    repository,
    llmClient,
    contentExtractor,
    promptBuilder
  );
}

/**
 * Check if summary generation is available.
 */
export function isSummaryAvailable(): boolean {
  const config = loadConfig();
  return !!(config.openRouterApiUrl && config.openRouterApiKey);
}
