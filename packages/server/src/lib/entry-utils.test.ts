import { describe, it, expect } from "vitest";
import {
  calculateIsEmpty,
  isRealUserEntry,
  isRealAssistantEntry,
} from "./entry-utils";

describe("entry-utils", () => {
  describe("isRealUserEntry", () => {
    it("returns true for a real user message", () => {
      const entry = {
        type: "user",
        subtype: null,
        data: {
          message: {
            content: "Hello, can you help me?",
          },
        },
      };
      expect(isRealUserEntry(entry)).toBe(true);
    });

    it("returns true for a human type message", () => {
      const entry = {
        type: "human",
        subtype: null,
        data: {
          message: {
            content: "Hello",
          },
        },
      };
      expect(isRealUserEntry(entry)).toBe(true);
    });

    it("returns false for assistant messages", () => {
      const entry = {
        type: "assistant",
        subtype: null,
        data: {
          message: {
            content: [{ type: "text", text: "Hello" }],
          },
        },
      };
      expect(isRealUserEntry(entry)).toBe(false);
    });

    it("returns false for tool results", () => {
      const entry = {
        type: "user",
        subtype: null,
        data: {
          message: {
            content: [
              {
                type: "tool_result",
                tool_use_id: "toolu_123",
                content: "Some output",
              },
            ],
          },
        },
      };
      expect(isRealUserEntry(entry)).toBe(false);
    });

    it("returns false for meta messages", () => {
      const entry = {
        type: "user",
        subtype: null,
        data: {
          isMeta: true,
          message: {
            content: "Meta info",
          },
        },
      };
      expect(isRealUserEntry(entry)).toBe(false);
    });

    it("returns false for agent messages", () => {
      const entry = {
        type: "user",
        subtype: null,
        data: {
          agentId: "a1b2c3d",
          message: {
            content: "Agent task",
          },
        },
      };
      expect(isRealUserEntry(entry)).toBe(false);
    });

    it("returns false for warmup messages", () => {
      const entry = {
        type: "user",
        subtype: null,
        data: {
          message: {
            content: "[Warmup message] Loading...",
          },
        },
      };
      expect(isRealUserEntry(entry)).toBe(false);
    });
  });

  describe("isRealAssistantEntry", () => {
    it("returns true for assistant message with text", () => {
      const entry = {
        type: "assistant",
        subtype: null,
        data: {
          message: {
            content: [{ type: "text", text: "Hello, how can I help?" }],
          },
        },
      };
      expect(isRealAssistantEntry(entry)).toBe(true);
    });

    it("returns false for tool-only responses", () => {
      const entry = {
        type: "assistant",
        subtype: null,
        data: {
          message: {
            content: [
              {
                type: "tool_use",
                id: "toolu_123",
                name: "Read",
                input: { file_path: "/path" },
              },
            ],
          },
        },
      };
      expect(isRealAssistantEntry(entry)).toBe(false);
    });

    it("returns true for tool use + text response", () => {
      const entry = {
        type: "assistant",
        subtype: null,
        data: {
          message: {
            content: [
              { type: "text", text: "Let me read that file." },
              {
                type: "tool_use",
                id: "toolu_123",
                name: "Read",
                input: { file_path: "/path" },
              },
            ],
          },
        },
      };
      expect(isRealAssistantEntry(entry)).toBe(true);
    });

    it("returns false for thinking-only responses", () => {
      const entry = {
        type: "assistant",
        subtype: null,
        data: {
          message: {
            content: [{ type: "thinking", thinking: "Let me think about this..." }],
          },
        },
      };
      expect(isRealAssistantEntry(entry)).toBe(false);
    });

    it("returns true for thinking + text response", () => {
      const entry = {
        type: "assistant",
        subtype: null,
        data: {
          message: {
            content: [
              { type: "thinking", thinking: "Let me think..." },
              { type: "text", text: "Here's my answer." },
            ],
          },
        },
      };
      expect(isRealAssistantEntry(entry)).toBe(true);
    });

    it("returns false for user type", () => {
      const entry = {
        type: "user",
        subtype: null,
        data: {
          message: {
            content: "Hello",
          },
        },
      };
      expect(isRealAssistantEntry(entry)).toBe(false);
    });
  });

  describe("calculateIsEmpty", () => {
    it("returns true for empty array", () => {
      expect(calculateIsEmpty([])).toBe(true);
    });

    it("returns false when there is a real user entry", () => {
      const entries = [
        {
          type: "user",
          subtype: null,
          data: {
            message: { content: "Hello" },
          },
        },
      ];
      expect(calculateIsEmpty(entries)).toBe(false);
    });

    it("returns false when there is a real assistant entry", () => {
      const entries = [
        {
          type: "assistant",
          subtype: null,
          data: {
            message: {
              content: [{ type: "text", text: "Hello back!" }],
            },
          },
        },
      ];
      expect(calculateIsEmpty(entries)).toBe(false);
    });

    it("returns true when only internal entries exist", () => {
      const entries = [
        {
          type: "system",
          subtype: "init",
          data: { some: "data" },
        },
        {
          type: "file-history-snapshot",
          subtype: null,
          data: { snapshot: {} },
        },
      ];
      expect(calculateIsEmpty(entries)).toBe(true);
    });

    it("returns true when only tool operations exist", () => {
      const entries = [
        // Tool use by assistant
        {
          type: "assistant",
          subtype: null,
          data: {
            message: {
              content: [
                {
                  type: "tool_use",
                  id: "toolu_123",
                  name: "Read",
                  input: {},
                },
              ],
            },
          },
        },
        // Tool result from user
        {
          type: "user",
          subtype: null,
          data: {
            message: {
              content: [
                {
                  type: "tool_result",
                  tool_use_id: "toolu_123",
                  content: "file contents",
                },
              ],
            },
          },
        },
      ];
      expect(calculateIsEmpty(entries)).toBe(true);
    });

    it("returns false with real conversation after tool use", () => {
      const entries = [
        // Real user message
        {
          type: "user",
          subtype: null,
          data: {
            message: { content: "Read this file please" },
          },
        },
        // Tool use by assistant
        {
          type: "assistant",
          subtype: null,
          data: {
            message: {
              content: [
                {
                  type: "tool_use",
                  id: "toolu_123",
                  name: "Read",
                  input: {},
                },
              ],
            },
          },
        },
        // Tool result
        {
          type: "user",
          subtype: null,
          data: {
            message: {
              content: [
                {
                  type: "tool_result",
                  tool_use_id: "toolu_123",
                  content: "file contents",
                },
              ],
            },
          },
        },
        // Real assistant response
        {
          type: "assistant",
          subtype: null,
          data: {
            message: {
              content: [{ type: "text", text: "Here is the file content." }],
            },
          },
        },
      ];
      expect(calculateIsEmpty(entries)).toBe(false);
    });
  });
});
