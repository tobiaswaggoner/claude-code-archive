import { describe, it, expect, vi, beforeEach } from "vitest";
import { SummaryGenerator } from "../../services/summary/generator.js";
import type {
  ISummaryRepository,
  ILLMClient,
  IContentExtractor,
  IPromptBuilder,
  SessionWithContext,
  ExtractedMessage,
  CompletionResponse,
} from "../../services/summary/types.js";
import type { Entry } from "../../db/schema/index.js";

describe("SummaryGenerator", () => {
  // Mock implementations
  let mockRepository: ISummaryRepository;
  let mockLLMClient: ILLMClient;
  let mockContentExtractor: IContentExtractor;
  let mockPromptBuilder: IPromptBuilder;
  let generator: SummaryGenerator;

  const mockSession: SessionWithContext = {
    session: {
      id: "session-1",
      originalSessionId: "orig-session-1",
      firstEntryAt: new Date("2026-01-01T10:00:00Z"),
      lastEntryAt: new Date("2026-01-01T12:00:00Z"),
      modelsUsed: ["claude-opus-4-5"],
      summary: null,
    },
    workspace: {
      id: "workspace-1",
      projectId: "project-1",
      cwd: "/home/user/project",
    },
    project: {
      id: "project-1",
      name: "my-project",
      description: "A test project",
    },
  };

  const mockEntries: Entry[] = [
    {
      id: "entry-1",
      sessionId: "session-1",
      originalUuid: null,
      lineNumber: 1,
      type: "user",
      subtype: null,
      timestamp: new Date(),
      data: {
        gitBranch: "main",
        message: { role: "user", content: "Hello" },
      },
    },
    {
      id: "entry-2",
      sessionId: "session-1",
      originalUuid: null,
      lineNumber: 2,
      type: "assistant",
      subtype: null,
      timestamp: new Date(),
      data: {
        message: { role: "assistant", content: [{ type: "text", text: "Hi!" }] },
      },
    },
  ] as Entry[];

  const mockExtractedMessages: ExtractedMessage[] = [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi!" },
  ];

  const mockCompletionResponse: CompletionResponse = {
    content: "This session focused on greeting implementation.",
    model: "moonshotai/kimi-k2-0905",
    usage: {
      promptTokens: 500,
      completionTokens: 50,
    },
  };

  beforeEach(() => {
    // Create fresh mocks for each test
    mockRepository = {
      getSession: vi.fn().mockResolvedValue(mockSession),
      getEntries: vi.fn().mockResolvedValue(mockEntries),
      getConfiguration: vi.fn().mockResolvedValue(new Map([
        ["model", "moonshotai/kimi-k2-0905"],
        ["max_tokens", "1000"],
        ["history_count", "3"],
        ["temperature", "0.3"],
      ])),
      getSessionHistory: vi.fn().mockResolvedValue([]),
      updateSessionSummary: vi.fn().mockResolvedValue(undefined),
    };

    mockLLMClient = {
      complete: vi.fn().mockResolvedValue(mockCompletionResponse),
    };

    mockContentExtractor = {
      extractConversation: vi.fn().mockReturnValue(mockExtractedMessages),
      formatConversation: vi.fn().mockReturnValue("### User\nHello\n\n### Assistant\nHi!"),
    };

    mockPromptBuilder = {
      buildPrompt: vi.fn().mockReturnValue("Built prompt content"),
    };

    generator = new SummaryGenerator(
      mockRepository,
      mockLLMClient,
      mockContentExtractor,
      mockPromptBuilder
    );
  });

  describe("generate", () => {
    it("generates summary for valid session", async () => {
      const result = await generator.generate({ sessionId: "session-1" });

      expect(result.summary).toBe("This session focused on greeting implementation.");
      expect(result.model).toBe("moonshotai/kimi-k2-0905");
      expect(result.usage.promptTokens).toBe(500);
      expect(result.usage.completionTokens).toBe(50);
    });

    it("throws error for non-existent session", async () => {
      mockRepository.getSession = vi.fn().mockResolvedValue(null);

      await expect(generator.generate({ sessionId: "nonexistent" }))
        .rejects.toThrow("Session not found");
    });

    it("loads session data correctly", async () => {
      await generator.generate({ sessionId: "session-1" });

      expect(mockRepository.getSession).toHaveBeenCalledWith("session-1");
    });

    it("loads entries for session", async () => {
      await generator.generate({ sessionId: "session-1" });

      expect(mockRepository.getEntries).toHaveBeenCalledWith("session-1");
    });

    it("extracts conversation from entries", async () => {
      await generator.generate({ sessionId: "session-1" });

      expect(mockContentExtractor.extractConversation).toHaveBeenCalledWith(mockEntries);
      expect(mockContentExtractor.formatConversation).toHaveBeenCalledWith(mockExtractedMessages);
    });

    it("loads configuration from repository", async () => {
      await generator.generate({ sessionId: "session-1" });

      expect(mockRepository.getConfiguration).toHaveBeenCalledWith("summary");
    });

    it("includes session history in prompt", async () => {
      const mockHistory = [
        {
          sessionId: "old-session",
          firstEntryAt: new Date("2025-12-31"),
          summary: "Previous work done",
        },
      ];
      mockRepository.getSessionHistory = vi.fn().mockResolvedValue(mockHistory);

      await generator.generate({ sessionId: "session-1" });

      expect(mockRepository.getSessionHistory).toHaveBeenCalledWith(
        "project-1",
        mockSession.session.firstEntryAt,
        3
      );
    });

    it("passes userInstructions to prompt builder", async () => {
      await generator.generate({
        sessionId: "session-1",
        userInstructions: "Focus on security",
      });

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          userInstructions: "Focus on security",
        })
      );
    });

    it("calls LLM with correct options", async () => {
      await generator.generate({ sessionId: "session-1" });

      expect(mockLLMClient.complete).toHaveBeenCalledWith(
        [{ role: "user", content: "Built prompt content" }],
        {
          model: "moonshotai/kimi-k2-0905",
          maxTokens: 1000,
          temperature: 0.3,
        }
      );
    });

    it("saves summary to repository", async () => {
      await generator.generate({ sessionId: "session-1" });

      expect(mockRepository.updateSessionSummary).toHaveBeenCalledWith(
        "session-1",
        "This session focused on greeting implementation."
      );
    });

    it("returns usage statistics", async () => {
      const result = await generator.generate({ sessionId: "session-1" });

      expect(result.usage).toEqual({
        promptTokens: 500,
        completionTokens: 50,
      });
    });

    it("uses default config when not in database", async () => {
      mockRepository.getConfiguration = vi.fn().mockResolvedValue(new Map());

      await generator.generate({ sessionId: "session-1" });

      expect(mockLLMClient.complete).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          model: "moonshotai/kimi-k2-0905",
          maxTokens: 1000,
        })
      );
    });

    it("extracts git branch from first entry with branch", async () => {
      await generator.generate({ sessionId: "session-1" });

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          session: expect.objectContaining({
            branch: "main",
          }),
        })
      );
    });

    it("handles missing git branch", async () => {
      mockRepository.getEntries = vi.fn().mockResolvedValue([
        {
          id: "entry-1",
          type: "user",
          data: { message: { content: "Hello" } }, // No gitBranch
        },
      ]);

      await generator.generate({ sessionId: "session-1" });

      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          session: expect.objectContaining({
            branch: null,
          }),
        })
      );
    });

    it("returns 'Leere Session' when no user messages", async () => {
      mockContentExtractor.extractConversation = vi.fn().mockReturnValue([
        { role: "assistant", content: "Hi!" },
      ]);

      const result = await generator.generate({ sessionId: "session-1" });

      expect(result.summary).toBe("Leere Session");
      expect(result.model).toBe("none");
      expect(result.usage).toEqual({ promptTokens: 0, completionTokens: 0 });
      expect(mockLLMClient.complete).not.toHaveBeenCalled();
      expect(mockRepository.updateSessionSummary).toHaveBeenCalledWith(
        "session-1",
        "Leere Session"
      );
    });

    it("returns 'Leere Session' when no assistant messages", async () => {
      mockContentExtractor.extractConversation = vi.fn().mockReturnValue([
        { role: "user", content: "Hello" },
      ]);

      const result = await generator.generate({ sessionId: "session-1" });

      expect(result.summary).toBe("Leere Session");
      expect(result.model).toBe("none");
      expect(mockLLMClient.complete).not.toHaveBeenCalled();
    });

    it("returns 'Leere Session' when no messages at all", async () => {
      mockContentExtractor.extractConversation = vi.fn().mockReturnValue([]);

      const result = await generator.generate({ sessionId: "session-1" });

      expect(result.summary).toBe("Leere Session");
      expect(result.model).toBe("none");
      expect(mockLLMClient.complete).not.toHaveBeenCalled();
    });
  });
});
