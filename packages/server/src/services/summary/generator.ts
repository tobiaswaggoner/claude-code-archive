import type {
  ISummaryGenerator,
  ISummaryRepository,
  ILLMClient,
  IContentExtractor,
  IPromptBuilder,
  GenerateSummaryOptions,
  SummaryResult,
  SummaryConfig,
} from "./types.js";

const DEFAULT_PROMPT_TEMPLATE = `Du analysierst Claude Code Konversationen.

## Projekt
- Name: {{project.name}}
- Beschreibung: {{project.description}}

## Session
- Start: {{session.startedAt}}
- Branch: {{session.branch}}
- Modelle: {{session.models}}

## Vorherige Sessions
{{history}}

## Aktuelle Konversation
{{conversation}}

{{#if userInstructions}}
## Zusätzliche Anweisungen
{{userInstructions}}
{{/if}}

Erstelle eine prägnante Zusammenfassung (2-3 Sätze):
1. Hauptziel
2. Wichtige Änderungen
3. Offene Punkte`;

const DEFAULT_CONFIG: SummaryConfig = {
  promptTemplate: DEFAULT_PROMPT_TEMPLATE,
  model: "moonshotai/kimi-k2-0905",
  maxTokens: 1000,
  historyCount: 3,
  temperature: "0.3",
};

/**
 * Main service for generating session summaries.
 */
export class SummaryGenerator implements ISummaryGenerator {
  constructor(
    private repository: ISummaryRepository,
    private llmClient: ILLMClient,
    private contentExtractor: IContentExtractor,
    private promptBuilder: IPromptBuilder
  ) {}

  async generate(options: GenerateSummaryOptions): Promise<SummaryResult> {
    // 1. Load session with workspace and project context
    const sessionData = await this.repository.getSession(options.sessionId);

    if (!sessionData) {
      throw new Error("Session not found");
    }

    // 2. Load entries
    const entries = await this.repository.getEntries(options.sessionId);

    // 3. Extract conversation
    const messages = this.contentExtractor.extractConversation(entries);

    // 4. Check for empty session (no user or no assistant message)
    const hasUserMessage = messages.some((m) => m.role === "user");
    const hasAssistantMessage = messages.some((m) => m.role === "assistant");

    if (!hasUserMessage || !hasAssistantMessage) {
      const emptySummary = "Leere Session";
      await this.repository.updateSessionSummary(options.sessionId, emptySummary);
      return {
        summary: emptySummary,
        model: "none",
        usage: { promptTokens: 0, completionTokens: 0 },
      };
    }

    // 5. Load configuration from DB
    const config = await this.loadConfig();

    const conversationText = this.contentExtractor.formatConversation(messages);

    // 6. Load history
    const historyText = await this.loadSessionHistory(
      sessionData.workspace.projectId,
      sessionData.session.firstEntryAt,
      config.historyCount
    );

    // 6. Extract git branch from first entry
    const gitBranch = this.extractGitBranch(entries);

    // 7. Build prompt
    const prompt = this.promptBuilder.buildPrompt(config.promptTemplate, {
      conversation: conversationText,
      project: {
        name: sessionData.project.name,
        description: sessionData.project.description,
      },
      session: {
        startedAt: sessionData.session.firstEntryAt?.toISOString() ?? "unknown",
        branch: gitBranch,
        models: sessionData.session.modelsUsed ?? [],
      },
      history: historyText,
      userInstructions: options.userInstructions ?? null,
    });

    // 8. Call LLM
    const response = await this.llmClient.complete(
      [{ role: "user", content: prompt }],
      {
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: parseFloat(config.temperature),
      }
    );

    // 9. Save summary to DB
    await this.repository.updateSessionSummary(
      options.sessionId,
      response.content
    );

    return {
      summary: response.content,
      model: response.model,
      usage: response.usage,
    };
  }

  private async loadConfig(): Promise<SummaryConfig> {
    const configMap = await this.repository.getConfiguration("summary");

    return {
      promptTemplate:
        configMap.get("prompt_template") ?? DEFAULT_CONFIG.promptTemplate,
      model: configMap.get("model") ?? DEFAULT_CONFIG.model,
      maxTokens: parseInt(
        configMap.get("max_tokens") ?? String(DEFAULT_CONFIG.maxTokens),
        10
      ),
      historyCount: parseInt(
        configMap.get("history_count") ?? String(DEFAULT_CONFIG.historyCount),
        10
      ),
      temperature: configMap.get("temperature") ?? DEFAULT_CONFIG.temperature,
    };
  }

  private async loadSessionHistory(
    projectId: string,
    beforeDate: Date | null,
    count: number
  ): Promise<string> {
    if (!beforeDate || count <= 0) {
      return "";
    }

    const previousSessions = await this.repository.getSessionHistory(
      projectId,
      beforeDate,
      count
    );

    if (previousSessions.length === 0) {
      return "";
    }

    return previousSessions
      .map(
        (s, i) =>
          `### Session ${i + 1} (${s.firstEntryAt?.toISOString().split("T")[0] ?? "unknown"})\n${s.summary}`
      )
      .join("\n\n");
  }

  private extractGitBranch(entries: { data: unknown }[]): string | null {
    for (const entry of entries) {
      const data = entry.data as Record<string, unknown>;
      if (data.gitBranch && typeof data.gitBranch === "string") {
        return data.gitBranch;
      }
    }
    return null;
  }
}
