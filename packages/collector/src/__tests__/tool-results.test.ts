import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fsPromises from "node:fs/promises";
import { loadToolResult } from "../sync/tool-results.js";

vi.mock("node:fs/promises");

const mockReadFile = vi.mocked(fsPromises.readFile);

describe("loadToolResult", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("with text content", () => {
    it("should load and parse text result", async () => {
      const toolResultContent = {
        toolName: "Read",
        result: "Hello, this is file content",
        isError: false,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-123");

      expect(result).not.toBeNull();
      expect(result!.toolUseId).toBe("tool-123");
      expect(result!.toolName).toBe("Read");
      expect(result!.contentType).toBe("text/plain");
      expect(result!.contentText).toBe("Hello, this is file content");
      expect(result!.contentBinary).toBeNull();
      expect(result!.sizeBytes).toBe(Buffer.byteLength("Hello, this is file content", "utf-8"));
      expect(result!.isError).toBe(false);
    });

    it("should handle text result with error flag", async () => {
      const toolResultContent = {
        toolName: "Bash",
        result: "Command failed: exit code 1",
        isError: true,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-456");

      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.contentType).toBe("text/plain");
      expect(result!.contentText).toBe("Command failed: exit code 1");
    });
  });

  describe("with image content", () => {
    it("should load and parse image result", async () => {
      const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const toolResultContent = {
        toolName: "Screenshot",
        result: {
          type: "image",
          source: {
            type: "base64",
            data: base64Data,
            media_type: "image/png",
          },
        },
        isError: false,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-789");

      expect(result).not.toBeNull();
      expect(result!.toolUseId).toBe("tool-789");
      expect(result!.toolName).toBe("Screenshot");
      expect(result!.contentType).toBe("image/png");
      expect(result!.contentText).toBeNull();
      expect(result!.contentBinary).toBe(base64Data);
      // Base64: 4 chars = 3 bytes
      expect(result!.sizeBytes).toBe(Math.ceil((base64Data.length * 3) / 4));
      expect(result!.isError).toBe(false);
    });

    it("should handle different image media types", async () => {
      const base64Data = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      const toolResultContent = {
        toolName: "Screenshot",
        result: {
          type: "image",
          source: {
            type: "base64",
            data: base64Data,
            media_type: "image/gif",
          },
        },
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-gif");

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe("image/gif");
    });
  });

  describe("with JSON content", () => {
    it("should load and parse JSON object result", async () => {
      const jsonResult = { files: ["a.ts", "b.ts"], count: 2 };
      const toolResultContent = {
        toolName: "Glob",
        result: jsonResult,
        isError: false,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-glob");

      expect(result).not.toBeNull();
      expect(result!.toolName).toBe("Glob");
      expect(result!.contentType).toBe("application/json");
      expect(result!.contentText).toBe(JSON.stringify(jsonResult));
      expect(result!.contentBinary).toBeNull();
      expect(result!.sizeBytes).toBe(Buffer.byteLength(JSON.stringify(jsonResult), "utf-8"));
    });

    it("should load and parse JSON array result", async () => {
      const arrayResult = [1, 2, 3, 4, 5];
      const toolResultContent = {
        toolName: "CustomTool",
        result: arrayResult,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-array");

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe("application/json");
      expect(result!.contentText).toBe(JSON.stringify(arrayResult));
    });

    it("should handle nested JSON structures", async () => {
      const nestedResult = {
        level1: {
          level2: {
            data: [1, 2, 3],
          },
        },
      };
      const toolResultContent = {
        toolName: "DeepTool",
        result: nestedResult,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-nested");

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe("application/json");
      expect(result!.contentText).toBe(JSON.stringify(nestedResult));
    });
  });

  describe("error handling", () => {
    it("should return null for missing file", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT: no such file or directory"));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "nonexistent");

      expect(result).toBeNull();
    });

    it("should return null for invalid JSON", async () => {
      mockReadFile.mockResolvedValue("not valid json {{{");

      const result = await loadToolResult("/project/.claude/session1/tool-results", "bad-json");

      expect(result).toBeNull();
    });

    it("should return null for permission errors", async () => {
      mockReadFile.mockRejectedValue(new Error("EACCES: permission denied"));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "no-access");

      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle missing toolName field", async () => {
      const toolResultContent = {
        result: "some result",
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-no-name");

      expect(result).not.toBeNull();
      expect(result!.toolName).toBe("unknown");
    });

    it("should handle null result", async () => {
      const toolResultContent = {
        toolName: "NullTool",
        result: null,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-null");

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe("application/json");
      expect(result!.contentText).toBe("null");
    });

    it("should handle empty string result", async () => {
      const toolResultContent = {
        toolName: "EmptyTool",
        result: "",
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-empty");

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe("text/plain");
      expect(result!.contentText).toBe("");
      expect(result!.sizeBytes).toBe(0);
    });

    it("should handle boolean result as JSON", async () => {
      const toolResultContent = {
        toolName: "BoolTool",
        result: true,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-bool");

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe("application/json");
      expect(result!.contentText).toBe("true");
    });

    it("should handle number result as JSON", async () => {
      const toolResultContent = {
        toolName: "NumberTool",
        result: 42,
      };

      mockReadFile.mockResolvedValue(JSON.stringify(toolResultContent));

      const result = await loadToolResult("/project/.claude/session1/tool-results", "tool-num");

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe("application/json");
      expect(result!.contentText).toBe("42");
    });

    it("should use correct file path", async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({ toolName: "Test", result: "test" }));

      await loadToolResult("/some/path/tool-results", "my-tool-id");

      expect(mockReadFile).toHaveBeenCalledWith(
        "/some/path/tool-results/my-tool-id.json",
        "utf-8"
      );
    });
  });
});
