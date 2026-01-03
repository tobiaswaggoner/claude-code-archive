import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fsPromises from "node:fs/promises";
import * as parser from "@claude-archive/parser";
import {
  discoverWorkspaces,
  buildSyncWorkspace,
  buildSyncSession,
  loadToolResultsForSession,
  type SessionState,
} from "../sync/sessions.js";
import type { ProjectInfo, SessionFile } from "@claude-archive/parser";

vi.mock("@claude-archive/parser");
vi.mock("node:fs/promises");

const mockListProjects = vi.mocked(parser.listProjects);
const mockReadFile = vi.mocked(fsPromises.readFile);

describe("discoverWorkspaces", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call listProjects from parser", async () => {
    const mockProjects: ProjectInfo[] = [
      {
        encodedPath: "-home-user-project",
        originalPath: "/home/user/project",
        claudePath: "/home/user/.claude/projects/-home-user-project",
        sessions: [],
      },
    ];
    mockListProjects.mockResolvedValue(mockProjects);

    const result = await discoverWorkspaces();

    expect(mockListProjects).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockProjects);
  });

  it("should return empty array when no projects", async () => {
    mockListProjects.mockResolvedValue([]);

    const result = await discoverWorkspaces();

    expect(result).toEqual([]);
  });

  it("should return multiple projects", async () => {
    const mockProjects: ProjectInfo[] = [
      {
        encodedPath: "-home-user-project1",
        originalPath: "/home/user/project1",
        claudePath: "/home/user/.claude/projects/-home-user-project1",
        sessions: [],
      },
      {
        encodedPath: "-home-user-project2",
        originalPath: "/home/user/project2",
        claudePath: "/home/user/.claude/projects/-home-user-project2",
        sessions: [],
      },
    ];
    mockListProjects.mockResolvedValue(mockProjects);

    const result = await discoverWorkspaces();

    expect(result).toHaveLength(2);
    expect(result[0].originalPath).toBe("/home/user/project1");
    expect(result[1].originalPath).toBe("/home/user/project2");
  });
});

describe("buildSyncSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("with no known state (full sync)", () => {
    it("should return all entries", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/session-abc.jsonl",
        sessionId: "session-abc",
        mtime: new Date(),
        size: 1024,
        isAgent: false,
      };

      const jsonlContent = [
        JSON.stringify({
          uuid: "uuid-1",
          type: "user",
          timestamp: "2024-01-15T10:00:00Z",
          sessionId: "session-abc",
          message: { role: "user", content: "Hello" },
        }),
        JSON.stringify({
          uuid: "uuid-2",
          type: "assistant",
          timestamp: "2024-01-15T10:00:01Z",
          sessionId: "session-abc",
          message: { role: "assistant", content: [] },
        }),
      ].join("\n");

      mockReadFile.mockResolvedValue(jsonlContent);

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.originalSessionId).toBe("session-abc");
      expect(result!.entries).toHaveLength(2);
      expect(result!.entries[0].lineNumber).toBe(1);
      expect(result!.entries[0].type).toBe("user");
      expect(result!.entries[1].lineNumber).toBe(2);
      expect(result!.entries[1].type).toBe("assistant");
    });

    it("should extract uuid, type, subtype, and timestamp", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/session.jsonl",
        sessionId: "session",
        mtime: new Date(),
        size: 512,
        isAgent: false,
      };

      const entry = {
        uuid: "my-uuid-123",
        type: "system",
        subtype: "compact_boundary",
        timestamp: "2024-01-15T12:00:00Z",
        content: "Compacted",
      };

      mockReadFile.mockResolvedValue(JSON.stringify(entry));

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.entries[0].originalUuid).toBe("my-uuid-123");
      expect(result!.entries[0].type).toBe("system");
      expect(result!.entries[0].subtype).toBe("compact_boundary");
      expect(result!.entries[0].timestamp).toBe("2024-01-15T12:00:00Z");
      expect(result!.entries[0].data).toEqual(entry);
    });
  });

  describe("with known state (delta sync)", () => {
    it("should only return new entries after lastLineNumber", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/session.jsonl",
        sessionId: "session",
        mtime: new Date(),
        size: 2048,
        isAgent: false,
      };

      const jsonlContent = [
        JSON.stringify({ uuid: "uuid-1", type: "user", timestamp: "2024-01-15T10:00:00Z" }),
        JSON.stringify({ uuid: "uuid-2", type: "assistant", timestamp: "2024-01-15T10:00:01Z" }),
        JSON.stringify({ uuid: "uuid-3", type: "user", timestamp: "2024-01-15T10:00:02Z" }),
        JSON.stringify({ uuid: "uuid-4", type: "assistant", timestamp: "2024-01-15T10:00:03Z" }),
      ].join("\n");

      mockReadFile.mockResolvedValue(jsonlContent);

      const knownState: SessionState = {
        originalSessionId: "session",
        entryCount: 2,
        lastLineNumber: 2,
      };

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        knownState
      );

      expect(result).not.toBeNull();
      expect(result!.entries).toHaveLength(2);
      expect(result!.entries[0].lineNumber).toBe(3);
      expect(result!.entries[0].originalUuid).toBe("uuid-3");
      expect(result!.entries[1].lineNumber).toBe(4);
      expect(result!.entries[1].originalUuid).toBe("uuid-4");
    });

    it("should return null when no new entries", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/session.jsonl",
        sessionId: "session",
        mtime: new Date(),
        size: 512,
        isAgent: false,
      };

      const jsonlContent = [
        JSON.stringify({ uuid: "uuid-1", type: "user" }),
        JSON.stringify({ uuid: "uuid-2", type: "assistant" }),
      ].join("\n");

      mockReadFile.mockResolvedValue(jsonlContent);

      const knownState: SessionState = {
        originalSessionId: "session",
        entryCount: 2,
        lastLineNumber: 2,
      };

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        knownState
      );

      expect(result).toBeNull();
    });
  });

  describe("agent session handling", () => {
    it("should extract parentOriginalSessionId from first entry", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/agent-abc123.jsonl",
        sessionId: "agent-abc123",
        mtime: new Date(),
        size: 1024,
        isAgent: true,
        agentId: "abc123",
      };

      const jsonlContent = [
        JSON.stringify({
          uuid: "uuid-1",
          type: "user",
          sessionId: "parent-session-xyz",
          agentId: "abc123",
        }),
        JSON.stringify({
          uuid: "uuid-2",
          type: "assistant",
          sessionId: "parent-session-xyz",
          agentId: "abc123",
        }),
      ].join("\n");

      mockReadFile.mockResolvedValue(jsonlContent);

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.agentId).toBe("abc123");
      expect(result!.parentOriginalSessionId).toBe("parent-session-xyz");
    });

    it("should set agentId from sessionFile", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/agent-def456.jsonl",
        sessionId: "agent-def456",
        mtime: new Date(),
        size: 512,
        isAgent: true,
        agentId: "def456",
      };

      mockReadFile.mockResolvedValue(JSON.stringify({ uuid: "uuid-1", type: "user" }));

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.agentId).toBe("def456");
    });
  });

  describe("error handling", () => {
    it("should return null when file cannot be read", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/session.jsonl",
        sessionId: "session",
        mtime: new Date(),
        size: 512,
        isAgent: false,
      };

      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        undefined
      );

      expect(result).toBeNull();
    });

    it("should skip malformed JSON lines", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/session.jsonl",
        sessionId: "session",
        mtime: new Date(),
        size: 1024,
        isAgent: false,
      };

      const jsonlContent = [
        JSON.stringify({ uuid: "uuid-1", type: "user" }),
        "not valid json {{{{",
        JSON.stringify({ uuid: "uuid-2", type: "assistant" }),
      ].join("\n");

      mockReadFile.mockResolvedValue(jsonlContent);

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.entries).toHaveLength(2);
      expect(result!.entries[0].lineNumber).toBe(1);
      expect(result!.entries[1].lineNumber).toBe(3);
    });

    it("should handle empty lines", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/session.jsonl",
        sessionId: "session",
        mtime: new Date(),
        size: 512,
        isAgent: false,
      };

      const jsonlContent = [
        JSON.stringify({ uuid: "uuid-1", type: "user" }),
        "",
        "   ",
        JSON.stringify({ uuid: "uuid-2", type: "assistant" }),
      ].join("\n");

      mockReadFile.mockResolvedValue(jsonlContent);

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        undefined
      );

      expect(result).not.toBeNull();
      // Empty lines are filtered out, so line numbers remain 1 and 2
      expect(result!.entries).toHaveLength(2);
    });
  });

  describe("entry field handling", () => {
    it("should handle missing optional fields", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/session.jsonl",
        sessionId: "session",
        mtime: new Date(),
        size: 256,
        isAgent: false,
      };

      // Entry with minimal fields
      const entry = { type: "user" };
      mockReadFile.mockResolvedValue(JSON.stringify(entry));

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.entries[0].originalUuid).toBeNull();
      expect(result!.entries[0].subtype).toBeNull();
      expect(result!.entries[0].timestamp).toBeNull();
    });

    it("should handle missing type field", async () => {
      const sessionFile: SessionFile = {
        path: "/home/user/.claude/projects/test/session.jsonl",
        sessionId: "session",
        mtime: new Date(),
        size: 256,
        isAgent: false,
      };

      const entry = { uuid: "uuid-1" };
      mockReadFile.mockResolvedValue(JSON.stringify(entry));

      const result = await buildSyncSession(
        "/home/user/.claude/projects/test",
        sessionFile,
        undefined
      );

      expect(result).not.toBeNull();
      expect(result!.entries[0].type).toBe("unknown");
    });
  });
});

describe("loadToolResultsForSession", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should load tool results for assistant entries with tool_use", async () => {
    const entries = [
      {
        originalUuid: "uuid-1",
        lineNumber: 1,
        type: "assistant",
        subtype: null,
        timestamp: "2024-01-15T10:00:00Z",
        data: {
          type: "assistant",
          message: {
            role: "assistant",
            content: [
              { type: "text", text: "Let me read that file" },
              { type: "tool_use", id: "tool-read-123", name: "Read", input: { path: "/file.txt" } },
            ],
          },
        },
      },
    ];

    // Mock successful tool result load
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({
        toolName: "Read",
        result: "File contents here",
        isError: false,
      })
    );

    const results = await loadToolResultsForSession(
      "/home/user/.claude/projects/test",
      "session-abc",
      entries
    );

    expect(mockReadFile).toHaveBeenCalledWith(
      "/home/user/.claude/projects/test/session-abc/tool-results/tool-read-123.json",
      "utf-8"
    );
    expect(results).toHaveLength(1);
    expect(results[0].toolUseId).toBe("tool-read-123");
    expect(results[0].toolName).toBe("Read");
  });

  it("should handle multiple tool uses in one message", async () => {
    const entries = [
      {
        originalUuid: "uuid-1",
        lineNumber: 1,
        type: "assistant",
        subtype: null,
        timestamp: null,
        data: {
          type: "assistant",
          message: {
            content: [
              { type: "tool_use", id: "tool-1", name: "Read" },
              { type: "text", text: "Some text" },
              { type: "tool_use", id: "tool-2", name: "Write" },
            ],
          },
        },
      },
    ];

    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ toolName: "Read", result: "content1" }))
      .mockResolvedValueOnce(JSON.stringify({ toolName: "Write", result: "content2" }));

    const results = await loadToolResultsForSession(
      "/project",
      "session",
      entries
    );

    expect(results).toHaveLength(2);
    expect(results[0].toolUseId).toBe("tool-1");
    expect(results[1].toolUseId).toBe("tool-2");
  });

  it("should skip entries without tool_use", async () => {
    const entries = [
      {
        originalUuid: "uuid-1",
        lineNumber: 1,
        type: "user",
        subtype: null,
        timestamp: null,
        data: {
          type: "user",
          message: { content: "Hello" },
        },
      },
      {
        originalUuid: "uuid-2",
        lineNumber: 2,
        type: "assistant",
        subtype: null,
        timestamp: null,
        data: {
          type: "assistant",
          message: {
            content: [{ type: "text", text: "Hi there" }],
          },
        },
      },
    ];

    const results = await loadToolResultsForSession(
      "/project",
      "session",
      entries
    );

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(results).toHaveLength(0);
  });

  it("should handle missing tool result files", async () => {
    const entries = [
      {
        originalUuid: "uuid-1",
        lineNumber: 1,
        type: "assistant",
        subtype: null,
        timestamp: null,
        data: {
          type: "assistant",
          message: {
            content: [
              { type: "tool_use", id: "tool-exists", name: "Read" },
              { type: "tool_use", id: "tool-missing", name: "Write" },
            ],
          },
        },
      },
    ];

    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ toolName: "Read", result: "content" }))
      .mockRejectedValueOnce(new Error("ENOENT"));

    const results = await loadToolResultsForSession(
      "/project",
      "session",
      entries
    );

    expect(results).toHaveLength(1);
    expect(results[0].toolUseId).toBe("tool-exists");
  });

  it("should return empty array for entries without message", async () => {
    const entries = [
      {
        originalUuid: "uuid-1",
        lineNumber: 1,
        type: "summary",
        subtype: null,
        timestamp: null,
        data: {
          type: "summary",
          summary: "This is a summary",
        },
      },
    ];

    const results = await loadToolResultsForSession(
      "/project",
      "session",
      entries
    );

    expect(results).toHaveLength(0);
  });
});

describe("buildSyncWorkspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should build workspace with sessions that have new entries", async () => {
    const project: ProjectInfo = {
      encodedPath: "-home-user-project",
      originalPath: "/home/user/project",
      claudePath: "/home/user/.claude/projects/-home-user-project",
      sessions: [
        {
          path: "/home/user/.claude/projects/-home-user-project/session-1.jsonl",
          sessionId: "session-1",
          mtime: new Date(),
          size: 512,
          isAgent: false,
        },
        {
          path: "/home/user/.claude/projects/-home-user-project/session-2.jsonl",
          sessionId: "session-2",
          mtime: new Date(),
          size: 256,
          isAgent: false,
        },
      ],
    };

    // Session 1 has new entries
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({ uuid: "uuid-1", type: "user" })
    );
    // Session 2 has no new entries (already synced)
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({ uuid: "uuid-2", type: "user" })
    );

    const knownState = new Map<string, SessionState>([
      ["session-2", { originalSessionId: "session-2", entryCount: 1, lastLineNumber: 1 }],
    ]);

    const result = await buildSyncWorkspace(project, knownState);

    expect(result.cwd).toBe("/home/user/project");
    expect(result.claudeProjectPath).toBe("/home/user/.claude/projects/-home-user-project");
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].originalSessionId).toBe("session-1");
  });

  it("should include hostname", async () => {
    const project: ProjectInfo = {
      encodedPath: "-test",
      originalPath: "/test",
      claudePath: "/home/user/.claude/projects/-test",
      sessions: [],
    };

    const result = await buildSyncWorkspace(project, new Map());

    expect(result.host).toBeTruthy();
    expect(typeof result.host).toBe("string");
  });

  it("should return empty sessions array when all sessions are up to date", async () => {
    const project: ProjectInfo = {
      encodedPath: "-test",
      originalPath: "/test",
      claudePath: "/home/user/.claude/projects/-test",
      sessions: [
        {
          path: "/home/user/.claude/projects/-test/session-1.jsonl",
          sessionId: "session-1",
          mtime: new Date(),
          size: 256,
          isAgent: false,
        },
      ],
    };

    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({ uuid: "uuid-1", type: "user" })
    );

    const knownState = new Map<string, SessionState>([
      ["session-1", { originalSessionId: "session-1", entryCount: 1, lastLineNumber: 1 }],
    ]);

    const result = await buildSyncWorkspace(project, knownState);

    expect(result.sessions).toHaveLength(0);
  });

  it("should handle project with no sessions", async () => {
    const project: ProjectInfo = {
      encodedPath: "-empty",
      originalPath: "/empty",
      claudePath: "/home/user/.claude/projects/-empty",
      sessions: [],
    };

    const result = await buildSyncWorkspace(project, new Map());

    expect(result.sessions).toHaveLength(0);
  });
});
