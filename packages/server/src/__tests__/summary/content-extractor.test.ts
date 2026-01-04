import { describe, it, expect } from "vitest";
import { ContentExtractor } from "../../services/summary/content-extractor.js";
import type { Entry } from "../../db/schema/index.js";

describe("ContentExtractor", () => {
  const extractor = new ContentExtractor();

  // Helper to create mock entries
  function createEntry(
    type: string,
    messageContent: unknown
  ): Entry {
    return {
      id: "test-id",
      sessionId: "test-session",
      originalUuid: null,
      lineNumber: 1,
      type,
      subtype: null,
      timestamp: new Date(),
      data: {
        message: {
          role: type,
          content: messageContent,
        },
      },
    } as Entry;
  }

  describe("extractConversation", () => {
    it("extracts text from user messages (string content)", () => {
      const entries = [createEntry("user", "Hello, how are you?")];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: "user",
        content: "Hello, how are you?",
      });
    });

    it("extracts text from user messages (array content)", () => {
      const entries = [
        createEntry("user", [{ type: "text", text: "Hello from array" }]),
      ];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Hello from array");
    });

    it("ignores tool_result in user messages", () => {
      const entries = [
        createEntry("user", [
          { type: "tool_result", tool_use_id: "123", content: "result" },
        ]),
      ];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(0);
    });

    it("extracts mixed user content (text + tool_result)", () => {
      const entries = [
        createEntry("user", [
          { type: "text", text: "Here is the file:" },
          { type: "tool_result", tool_use_id: "123", content: "file content" },
          { type: "text", text: "What do you think?" },
        ]),
      ];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Here is the file:\nWhat do you think?");
    });

    it("extracts only text from assistant messages", () => {
      const entries = [
        createEntry("assistant", [
          { type: "text", text: "I will analyze this." },
        ]),
      ];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: "assistant",
        content: "I will analyze this.",
      });
    });

    it("ignores thinking blocks", () => {
      const entries = [
        createEntry("assistant", [
          { type: "thinking", thinking: "Let me think..." },
          { type: "text", text: "Here is my response." },
        ]),
      ];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Here is my response.");
    });

    it("ignores tool_use blocks", () => {
      const entries = [
        createEntry("assistant", [
          { type: "text", text: "Let me read the file." },
          { type: "tool_use", id: "123", name: "Read", input: { path: "/test" } },
        ]),
      ];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Let me read the file.");
    });

    it("handles empty content arrays", () => {
      const entries = [createEntry("user", [])];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(0);
    });

    it("handles string content in user messages", () => {
      const entries = [createEntry("user", "Simple string message")];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Simple string message");
    });

    it("filters out non-user/assistant entries", () => {
      const entries = [
        createEntry("system", "System message"),
        createEntry("user", "User message"),
        createEntry("summary", "Summary"),
        createEntry("assistant", [{ type: "text", text: "Response" }]),
      ];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("user");
      expect(result[1].role).toBe("assistant");
    });

    it("handles multiple messages in sequence", () => {
      const entries = [
        createEntry("user", "First question"),
        createEntry("assistant", [{ type: "text", text: "First answer" }]),
        createEntry("user", "Second question"),
        createEntry("assistant", [{ type: "text", text: "Second answer" }]),
      ];

      const result = extractor.extractConversation(entries);

      expect(result).toHaveLength(4);
      expect(result[0].content).toBe("First question");
      expect(result[1].content).toBe("First answer");
      expect(result[2].content).toBe("Second question");
      expect(result[3].content).toBe("Second answer");
    });

    it("handles entries without message field", () => {
      const entry = {
        id: "test-id",
        sessionId: "test-session",
        originalUuid: null,
        lineNumber: 1,
        type: "user",
        subtype: null,
        timestamp: new Date(),
        data: {}, // No message field
      } as Entry;

      const result = extractor.extractConversation([entry]);

      expect(result).toHaveLength(0);
    });
  });

  describe("formatConversation", () => {
    it("formats messages with headers", () => {
      const messages = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi there!" },
      ];

      const result = extractor.formatConversation(messages);

      expect(result).toBe("### User\nHello\n\n### Assistant\nHi there!");
    });

    it("handles empty messages array", () => {
      const result = extractor.formatConversation([]);

      expect(result).toBe("");
    });

    it("preserves multiline content", () => {
      const messages = [
        { role: "user" as const, content: "Line 1\nLine 2\nLine 3" },
      ];

      const result = extractor.formatConversation(messages);

      expect(result).toBe("### User\nLine 1\nLine 2\nLine 3");
    });
  });
});
