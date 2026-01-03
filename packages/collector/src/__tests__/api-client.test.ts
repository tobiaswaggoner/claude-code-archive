import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiClient, ApiError } from "../api/client.js";
import type { Config } from "../config.js";
import type {
  RegisterRequest,
  RegisterResponse,
  HeartbeatRequest,
  SessionStateResponse,
  CommitStateResponse,
  SyncRequest,
  SyncResponse,
  LogEntry,
  SubmitLogsResponse,
} from "../api/types.js";

// Mock global fetch
const mockFetch = vi.fn();

describe("ApiClient", () => {
  let client: ApiClient;
  const config: Config = {
    serverUrl: "https://api.example.com",
    apiKey: "test-api-key-123",
    collectorName: "test-collector",
    logLevel: "info",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
    client = new ApiClient(config);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("register", () => {
    it("should send correct registration request", async () => {
      const request: RegisterRequest = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "my-collector",
        hostname: "my-host",
        osInfo: "Linux 6.1",
        version: "1.0.0",
        config: { syncInterval: 60 },
      };

      const responseData: RegisterResponse = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "my-collector",
        hostname: "my-host",
        osInfo: "Linux 6.1",
        version: "1.0.0",
        config: { syncInterval: 60 },
        registeredAt: "2024-01-01T00:00:00Z",
        lastSeenAt: "2024-01-01T00:00:00Z",
        lastSyncRunId: null,
        lastSyncStatus: null,
        isActive: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await client.register(request);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.example.com/api/collectors/register");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(options.headers["X-API-Key"]).toBe("test-api-key-123");
      expect(JSON.parse(options.body)).toEqual(request);
      expect(result).toEqual(responseData);
    });

    it("should send minimal registration request", async () => {
      const request: RegisterRequest = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "my-collector",
        hostname: "my-host",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ...request,
          osInfo: null,
          version: null,
          config: null,
          registeredAt: "2024-01-01T00:00:00Z",
          lastSeenAt: "2024-01-01T00:00:00Z",
          lastSyncRunId: null,
          lastSyncStatus: null,
          isActive: true,
        }),
      });

      await client.register(request);

      const [, options] = mockFetch.mock.calls[0];
      expect(JSON.parse(options.body)).toEqual(request);
    });
  });

  describe("heartbeat", () => {
    const collectorId = "550e8400-e29b-41d4-a716-446655440000";

    it("should send heartbeat with data", async () => {
      const request: HeartbeatRequest = {
        syncRunId: "660e8400-e29b-41d4-a716-446655440001",
        syncStatus: "success",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.heartbeat(collectorId, request);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        `https://api.example.com/api/collectors/${collectorId}/heartbeat`
      );
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual(request);
    });

    it("should send heartbeat without data", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await client.heartbeat(collectorId);

      const [, options] = mockFetch.mock.calls[0];
      expect(JSON.parse(options.body)).toEqual({});
    });
  });

  describe("getSessionState", () => {
    const collectorId = "550e8400-e29b-41d4-a716-446655440000";

    it("should build correct query params", async () => {
      const responseData: SessionStateResponse = {
        sessions: [
          {
            originalSessionId: "session-123",
            entryCount: 42,
            lastLineNumber: 100,
          },
          {
            originalSessionId: "session-456",
            entryCount: 10,
            lastLineNumber: 20,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await client.getSessionState(
        collectorId,
        "my-host",
        "/home/user/project"
      );

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      const parsedUrl = new URL(url);
      expect(parsedUrl.pathname).toBe(
        `/api/collectors/${collectorId}/session-state`
      );
      expect(parsedUrl.searchParams.get("host")).toBe("my-host");
      expect(parsedUrl.searchParams.get("cwd")).toBe("/home/user/project");
      expect(options.method).toBe("GET");
      expect(options.headers["X-API-Key"]).toBe("test-api-key-123");
      expect(options.body).toBeUndefined();
      expect(result).toEqual(responseData);
    });
  });

  describe("getCommitState", () => {
    const collectorId = "550e8400-e29b-41d4-a716-446655440000";

    it("should build correct query params", async () => {
      const responseData: CommitStateResponse = {
        knownShas: ["abc123", "def456", "ghi789"],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await client.getCommitState(
        collectorId,
        "my-host",
        "/home/user/repo"
      );

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      const parsedUrl = new URL(url);
      expect(parsedUrl.pathname).toBe(
        `/api/collectors/${collectorId}/commit-state`
      );
      expect(parsedUrl.searchParams.get("host")).toBe("my-host");
      expect(parsedUrl.searchParams.get("path")).toBe("/home/user/repo");
      expect(options.method).toBe("GET");
      expect(result).toEqual(responseData);
    });
  });

  describe("sync", () => {
    const collectorId = "550e8400-e29b-41d4-a716-446655440000";

    it("should send correct sync request", async () => {
      const request: SyncRequest = {
        syncRunId: "660e8400-e29b-41d4-a716-446655440001",
        gitRepos: [
          {
            host: "my-host",
            path: "/home/user/project",
            upstreamUrl: "https://github.com/user/repo.git",
            defaultBranch: "main",
            currentBranch: "feature-branch",
            headSha: "abc123",
            isDirty: false,
            dirtyFilesCount: null,
            dirtySnapshot: null,
            lastFileChangeAt: null,
            branches: [
              {
                name: "main",
                headSha: "abc123",
                upstreamName: "origin/main",
                upstreamSha: "abc123",
                aheadCount: 0,
                behindCount: 0,
                lastCommitAt: "2024-01-01T00:00:00Z",
              },
            ],
            commits: [
              {
                sha: "abc123",
                message: "Initial commit",
                authorName: "John Doe",
                authorEmail: "john@example.com",
                authorDate: "2024-01-01T00:00:00Z",
                committerName: null,
                committerDate: null,
                parentShas: [],
              },
            ],
          },
        ],
        workspaces: [
          {
            host: "my-host",
            cwd: "/home/user/project",
            claudeProjectPath: "/home/user/.claude/projects/abc",
            sessions: [
              {
                originalSessionId: "session-123",
                agentId: null,
                parentOriginalSessionId: null,
                filename: "session.jsonl",
                entries: [
                  {
                    originalUuid: "entry-uuid-1",
                    lineNumber: 1,
                    type: "message",
                    subtype: "user",
                    timestamp: "2024-01-01T00:00:00Z",
                    data: { content: "Hello" },
                  },
                ],
                toolResults: [
                  {
                    toolUseId: "tool-123",
                    toolName: "Read",
                    contentType: "text/plain",
                    contentText: "File content",
                    contentBinary: null,
                    sizeBytes: 12,
                    isError: false,
                  },
                ],
              },
            ],
          },
        ],
      };

      const responseData: SyncResponse = {
        projectsCreated: 1,
        projectsUpdated: 0,
        gitReposCreated: 1,
        gitReposUpdated: 0,
        workspacesCreated: 1,
        workspacesUpdated: 0,
        sessionsCreated: 1,
        sessionsUpdated: 0,
        entriesCreated: 1,
        commitsCreated: 1,
        branchesCreated: 1,
        branchesUpdated: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await client.sync(collectorId, request);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        `https://api.example.com/api/collectors/${collectorId}/sync`
      );
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(options.body)).toEqual(request);
      expect(result).toEqual(responseData);
    });

    it("should send minimal sync request", async () => {
      const request: SyncRequest = {
        syncRunId: "660e8400-e29b-41d4-a716-446655440001",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          projectsCreated: 0,
          projectsUpdated: 0,
          gitReposCreated: 0,
          gitReposUpdated: 0,
          workspacesCreated: 0,
          workspacesUpdated: 0,
          sessionsCreated: 0,
          sessionsUpdated: 0,
          entriesCreated: 0,
          commitsCreated: 0,
          branchesCreated: 0,
          branchesUpdated: 0,
        }),
      });

      await client.sync(collectorId, request);

      const [, options] = mockFetch.mock.calls[0];
      expect(JSON.parse(options.body)).toEqual(request);
    });
  });

  describe("submitLogs", () => {
    const collectorId = "550e8400-e29b-41d4-a716-446655440000";

    it("should send logs correctly", async () => {
      const logs: LogEntry[] = [
        {
          syncRunId: "660e8400-e29b-41d4-a716-446655440001",
          level: "info",
          message: "Starting sync",
          context: { projectCount: 5 },
        },
        {
          syncRunId: "660e8400-e29b-41d4-a716-446655440001",
          level: "error",
          message: "Failed to sync project",
          context: { projectId: "abc", error: "Connection timeout" },
        },
      ];

      const responseData: SubmitLogsResponse = {
        count: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await client.submitLogs(collectorId, logs);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        `https://api.example.com/api/collectors/${collectorId}/logs`
      );
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({ logs });
      expect(result).toEqual(responseData);
    });
  });

  describe("error handling", () => {
    it("should throw ApiError on 401 Unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "Invalid API key" }),
      });

      let caughtError: unknown;
      try {
        await client.register({
          id: "test-id",
          name: "test",
          hostname: "test-host",
        });
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(ApiError);
      expect((caughtError as ApiError).status).toBe(401);
      expect((caughtError as ApiError).message).toContain("Invalid API key");
      expect((caughtError as ApiError).body).toEqual({ error: "Invalid API key" });
    });

    it("should throw ApiError on 403 Forbidden", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({
          error: "forbidden",
          message: "Access denied to resource",
        }),
      });

      try {
        await client.register({
          id: "test-id",
          name: "test",
          hostname: "test-host",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(403);
        expect((error as ApiError).message).toContain("Access denied");
      }
    });

    it("should throw ApiError on 500 Internal Server Error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Internal server error" }),
      });

      try {
        await client.register({
          id: "test-id",
          name: "test",
          hostname: "test-host",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
      }
    });

    it("should handle non-JSON error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: async () => {
          throw new Error("Not JSON");
        },
      });

      try {
        await client.register({
          id: "test-id",
          name: "test",
          hostname: "test-host",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(502);
        expect((error as ApiError).message).toContain("Bad Gateway");
      }
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      try {
        await client.register({
          id: "test-id",
          name: "test",
          hostname: "test-host",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(0);
        expect((error as ApiError).message).toContain("Connection refused");
      }
    });

    it("should handle DNS resolution errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND api.example.com"));

      try {
        await client.register({
          id: "test-id",
          name: "test",
          hostname: "test-host",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(0);
        expect((error as ApiError).message).toContain("ENOTFOUND");
      }
    });

    it("should handle validation errors with details", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          error: "validation_error",
          message: "Validation failed",
          details: [
            { path: "name", message: "String must contain at least 1 character(s)" },
            { path: "id", message: "Invalid uuid" },
          ],
        }),
      });

      try {
        await client.register({
          id: "invalid",
          name: "",
          hostname: "test-host",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
        expect((error as ApiError).body).toHaveProperty("details");
      }
    });
  });

  describe("URL handling", () => {
    it("should handle server URL with trailing slash", async () => {
      const configWithSlash: Config = {
        ...config,
        serverUrl: "https://api.example.com/",
      };
      const clientWithSlash = new ApiClient(configWithSlash);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "test",
          name: "test",
          hostname: "test",
          osInfo: null,
          version: null,
          config: null,
          registeredAt: "2024-01-01T00:00:00Z",
          lastSeenAt: "2024-01-01T00:00:00Z",
          lastSyncRunId: null,
          lastSyncStatus: null,
          isActive: true,
        }),
      });

      await clientWithSlash.register({
        id: "test",
        name: "test",
        hostname: "test",
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.example.com/api/collectors/register");
    });

    it("should handle server URL without trailing slash", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "test",
          name: "test",
          hostname: "test",
          osInfo: null,
          version: null,
          config: null,
          registeredAt: "2024-01-01T00:00:00Z",
          lastSeenAt: "2024-01-01T00:00:00Z",
          lastSyncRunId: null,
          lastSyncStatus: null,
          isActive: true,
        }),
      });

      await client.register({
        id: "test",
        name: "test",
        hostname: "test",
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.example.com/api/collectors/register");
    });
  });

  describe("headers", () => {
    it("should include X-API-Key header in all requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const collectorId = "550e8400-e29b-41d4-a716-446655440000";

      // Test various endpoints
      await client.register({ id: "test", name: "test", hostname: "test" });
      await client.heartbeat(collectorId);
      await client.getSessionState(collectorId, "host", "/path");
      await client.getCommitState(collectorId, "https://github.com/user/repo");

      for (const call of mockFetch.mock.calls) {
        const [, options] = call;
        expect(options.headers["X-API-Key"]).toBe("test-api-key-123");
      }
    });

    it("should only include Content-Type for requests with body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ sessions: [] }),
      });

      const collectorId = "550e8400-e29b-41d4-a716-446655440000";

      // GET request - no Content-Type
      await client.getSessionState(collectorId, "host", "/path");
      const [, getOptions] = mockFetch.mock.calls[0];
      expect(getOptions.headers["Content-Type"]).toBeUndefined();

      mockFetch.mockClear();

      // POST request with body - has Content-Type
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "test",
          name: "test",
          hostname: "test",
          osInfo: null,
          version: null,
          config: null,
          registeredAt: "2024-01-01T00:00:00Z",
          lastSeenAt: "2024-01-01T00:00:00Z",
          lastSyncRunId: null,
          lastSyncStatus: null,
          isActive: true,
        }),
      });
      await client.register({ id: "test", name: "test", hostname: "test" });
      const [, postOptions] = mockFetch.mock.calls[0];
      expect(postOptions.headers["Content-Type"]).toBe("application/json");
    });
  });
});

describe("ApiError", () => {
  it("should create error with correct properties", () => {
    const error = new ApiError(404, "Not found", { error: "resource_not_found" });

    expect(error.status).toBe(404);
    expect(error.message).toBe("API Error 404: Not found");
    expect(error.body).toEqual({ error: "resource_not_found" });
    expect(error.name).toBe("ApiError");
    expect(error).toBeInstanceOf(Error);
  });

  it("should create error without body", () => {
    const error = new ApiError(500, "Internal error");

    expect(error.status).toBe(500);
    expect(error.message).toBe("API Error 500: Internal error");
    expect(error.body).toBeUndefined();
  });
});
