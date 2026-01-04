import type { Entry } from "../../db/schema/index.js";

// ============================================================================
// Data Types
// ============================================================================

export interface SessionWithContext {
  session: {
    id: string;
    originalSessionId: string;
    firstEntryAt: Date | null;
    lastEntryAt: Date | null;
    modelsUsed: string[] | null;
    summary: string | null;
  };
  workspace: {
    id: string;
    projectId: string;
    cwd: string;
  };
  project: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface SessionSummary {
  sessionId: string;
  firstEntryAt: Date | null;
  summary: string;
}

export interface ExtractedMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PromptContext {
  conversation: string;
  project: {
    name: string;
    description: string | null;
  };
  session: {
    startedAt: string;
    branch: string | null;
    models: string[];
  };
  history: string;
  userInstructions: string | null;
}

export interface SummaryConfig {
  promptTemplate: string;
  model: string;
  maxTokens: number;
  historyCount: number;
  temperature: string;
}

// ============================================================================
// LLM Client Types
// ============================================================================

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model: string;
  maxTokens: number;
  temperature?: number;
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

// ============================================================================
// Service Interfaces (for Dependency Injection)
// ============================================================================

/**
 * Repository for database operations related to summaries.
 */
export interface ISummaryRepository {
  /**
   * Get session with workspace and project context.
   */
  getSession(id: string): Promise<SessionWithContext | null>;

  /**
   * Get all entries for a session.
   */
  getEntries(sessionId: string): Promise<Entry[]>;

  /**
   * Get configuration values for a category.
   */
  getConfiguration(category: string): Promise<Map<string, string>>;

  /**
   * Get previous session summaries for a project.
   */
  getSessionHistory(
    projectId: string,
    before: Date,
    limit: number
  ): Promise<SessionSummary[]>;

  /**
   * Update the summary field of a session.
   */
  updateSessionSummary(sessionId: string, summary: string): Promise<void>;
}

/**
 * LLM client for generating completions.
 */
export interface ILLMClient {
  /**
   * Generate a completion from the LLM.
   */
  complete(
    messages: ChatMessage[],
    options: CompletionOptions
  ): Promise<CompletionResponse>;
}

/**
 * Content extractor for filtering entries.
 */
export interface IContentExtractor {
  /**
   * Extract text messages from entries.
   * Filters out thinking, tool_use, tool_result.
   */
  extractConversation(entries: Entry[]): ExtractedMessage[];

  /**
   * Format extracted messages as readable text.
   */
  formatConversation(messages: ExtractedMessage[]): string;
}

/**
 * Prompt builder for template substitution.
 */
export interface IPromptBuilder {
  /**
   * Build prompt from template with context.
   */
  buildPrompt(template: string, context: PromptContext): string;
}

// ============================================================================
// Summary Generator Types
// ============================================================================

export interface GenerateSummaryOptions {
  sessionId: string;
  userInstructions?: string;
}

export interface SummaryResult {
  summary: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Main service for generating summaries.
 */
export interface ISummaryGenerator {
  /**
   * Generate a summary for a session.
   */
  generate(options: GenerateSummaryOptions): Promise<SummaryResult>;
}
