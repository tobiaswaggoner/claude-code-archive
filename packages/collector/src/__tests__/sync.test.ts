import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runSync, retryConfig, type SyncResult } from "../sync/index.js";
import type { Config } from "../config.js";
import type { CliArgs } from "../cli.js";

// Disable retry delays for fast tests
retryConfig.delayMs = 0;

// =============================================================================
// Mocks
// =============================================================================

// Mock ApiClient
vi.mock("../api/client.js", () => {
  const mockClient = {
    register: vi.fn(),
    heartbeat: vi.fn(),
    getSessionState: vi.fn(),
    getCommitState: vi.fn(),
    sync: vi.fn(),
  };

  return {
    ApiClient: vi.fn(() => mockClient),
    ApiError: class ApiError extends Error {
      constructor(
        public readonly status: number,
        message: string,
        public readonly body?: unknown
      ) {
        super(`API Error ${status}: ${message}`);
        this.name = "ApiError";
      }
    },
  };
});

// Mock collector-id
vi.mock("../collector-id.js", () => ({
  getOrCreateCollectorId: vi.fn(() => "test-collector-id-12345"),
}));

// Mock git discovery and extraction
vi.mock("../sync/git.js", () => ({
  discoverGitRepos: vi.fn(),
  extractBranches: vi.fn(),
  extractCommits: vi.fn(),
  buildSyncGitRepo: vi.fn(),
  normalizeUpstreamUrl: vi.fn((url: string) => url),
}));

// Mock session discovery
vi.mock("../sync/sessions.js", () => ({
  discoverWorkspaces: vi.fn(),
  buildSyncWorkspace: vi.fn(),
}));

// Import mocks after they're defined
import { ApiClient } from "../api/client.js";
import { getOrCreateCollectorId } from "../collector-id.js";
import {
  discoverGitRepos,
  extractBranches,
  extractCommits,
  buildSyncGitRepo,
} from "../sync/git.js";
import { discoverWorkspaces, buildSyncWorkspace } from "../sync/sessions.js";

// =============================================================================
// Test Setup
// =============================================================================

describe("runSync", () => {
  // Default config and args
  const config: Config = {
    serverUrl: "https://api.example.com",
    apiKey: "test-api-key",
    collectorName: "test-collector",
    logLevel: "info",
  };

  const baseArgs: CliArgs = {
    sourceDirs: [],
    verbose: false,
    dryRun: false,
    help: false,
  };

  // Get mocked client instance
  let mockClient: ReturnType<typeof ApiClient>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mocked client instance
    new ApiClient(config);
    mockClient = vi.mocked(ApiClient).mock.results[0]?.value || {
      register: vi.fn(),
      heartbeat: vi.fn(),
      getSessionState: vi.fn(),
      getCommitState: vi.fn(),
      sync: vi.fn(),
    };

    // Setup default mock returns
    vi.mocked(mockClient.register).mockResolvedValue({
      id: "test-collector-id-12345",
      name: "test-collector",
      hostname: "test-host",
      osInfo: "Linux 6.1",
      version: "1.0.0",
      config: null,
      registeredAt: "2024-01-01T00:00:00Z",
      lastSeenAt: "2024-01-01T00:00:00Z",
      lastSyncRunId: null,
      lastSyncStatus: null,
      isActive: true,
    });

    vi.mocked(mockClient.heartbeat).mockResolvedValue(undefined);
    vi.mocked(mockClient.getSessionState).mockResolvedValue({ sessions: [] });
    vi.mocked(mockClient.getCommitState).mockResolvedValue({ knownShas: [] });
    vi.mocked(mockClient.sync).mockResolvedValue({
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
    });

    // Setup default discovery mock returns
    vi.mocked(discoverGitRepos).mockResolvedValue([]);
    vi.mocked(discoverWorkspaces).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Registration and Heartbeat Tests
  // ===========================================================================

  describe("registration and heartbeat", () => {
    it("should call register and heartbeat on startup", async () => {
      const result = await runSync(config, baseArgs);

      expect(result.syncRunId).toBeDefined();
      expect(result.syncRunId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(result.errors).toHaveLength(0);

      // Verify ApiClient was instantiated
      expect(ApiClient).toHaveBeenCalledWith(config);
    });

    it("should skip registration and heartbeat in dry-run mode", async () => {
      const args: CliArgs = { ...baseArgs, dryRun: true };

      const result = await runSync(config, args);

      expect(result.dryRun).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should continue on registration failure", async () => {
      // Clear the default mock and set up a new one that rejects
      vi.mocked(ApiClient).mockClear();
      const failingClient = {
        register: vi.fn().mockRejectedValue(new Error("Connection refused")),
        heartbeat: vi.fn().mockResolvedValue(undefined),
        getSessionState: vi.fn().mockResolvedValue({ sessions: [] }),
        getCommitState: vi.fn().mockResolvedValue({ knownShas: [] }),
        sync: vi.fn().mockResolvedValue({
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
      };
      vi.mocked(ApiClient).mockReturnValue(failingClient as any);

      const result = await runSync(config, baseArgs);

      // Should have recorded an error but continued
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors.some((e) => e.includes("Registration failed"))).toBe(true);
    });
  });

  // ===========================================================================
  // Git Repository Sync Tests
  // ===========================================================================

  describe("git repository sync", () => {
    it("should discover git repos when sourceDirs provided", async () => {
      const args: CliArgs = {
        ...baseArgs,
        sourceDirs: ["/home/user/projects"],
      };

      vi.mocked(discoverGitRepos).mockResolvedValue([
        {
          path: "/home/user/projects/repo1",
          upstreamUrl: "github.com/user/repo1",
          defaultBranch: "main",
          currentBranch: "main",
          headSha: "abc123",
          isDirty: false,
          dirtyFilesCount: 0,
          dirtySnapshot: null,
          lastFileChangeAt: null,
        },
      ]);

      vi.mocked(extractBranches).mockResolvedValue([
        {
          name: "main",
          headSha: "abc123",
          upstreamName: "origin/main",
          upstreamSha: "abc123",
          aheadCount: 0,
          behindCount: 0,
          lastCommitAt: "2024-01-01T00:00:00Z",
        },
      ]);

      vi.mocked(extractCommits).mockResolvedValue([
        {
          sha: "abc123",
          message: "Initial commit",
          authorName: "Test User",
          authorEmail: "test@example.com",
          authorDate: "2024-01-01T00:00:00Z",
          committerName: "Test User",
          committerDate: "2024-01-01T00:00:00Z",
          parentShas: [],
        },
      ]);

      vi.mocked(buildSyncGitRepo).mockReturnValue({
        host: "test-host",
        path: "/home/user/projects/repo1",
        upstreamUrl: "github.com/user/repo1",
        defaultBranch: "main",
        currentBranch: "main",
        headSha: "abc123",
        isDirty: false,
        dirtyFilesCount: 0,
        dirtySnapshot: null,
        lastFileChangeAt: null,
        branches: [],
        commits: [],
      });

      const result = await runSync(config, args);

      expect(discoverGitRepos).toHaveBeenCalledWith(["/home/user/projects"]);
      expect(result.gitReposProcessed).toBe(1);
      expect(result.gitReposSynced).toBe(1);
      expect(result.commitsFound).toBe(1);
    });

    it("should skip git repos when no sourceDirs provided", async () => {
      const result = await runSync(config, baseArgs);

      expect(discoverGitRepos).not.toHaveBeenCalled();
      expect(result.gitReposProcessed).toBe(0);
      expect(result.gitReposSynced).toBe(0);
    });

    it("should handle errors in individual git repos gracefully", async () => {
      const args: CliArgs = {
        ...baseArgs,
        sourceDirs: ["/home/user/projects"],
      };

      vi.mocked(discoverGitRepos).mockResolvedValue([
        {
          path: "/home/user/projects/repo1",
          upstreamUrl: "github.com/user/repo1",
          defaultBranch: "main",
          currentBranch: "main",
          headSha: "abc123",
          isDirty: false,
          dirtyFilesCount: 0,
          dirtySnapshot: null,
          lastFileChangeAt: null,
        },
        {
          path: "/home/user/projects/repo2",
          upstreamUrl: "github.com/user/repo2",
          defaultBranch: "main",
          currentBranch: "main",
          headSha: "def456",
          isDirty: false,
          dirtyFilesCount: 0,
          dirtySnapshot: null,
          lastFileChangeAt: null,
        },
      ]);

      // First repo fails
      vi.mocked(extractBranches)
        .mockRejectedValueOnce(new Error("Permission denied"))
        .mockResolvedValueOnce([]);

      vi.mocked(extractCommits).mockResolvedValue([]);
      vi.mocked(buildSyncGitRepo).mockReturnValue({
        host: "test-host",
        path: "/home/user/projects/repo2",
        upstreamUrl: "github.com/user/repo2",
        defaultBranch: "main",
        currentBranch: "main",
        headSha: "def456",
        isDirty: false,
        dirtyFilesCount: 0,
        dirtySnapshot: null,
        lastFileChangeAt: null,
        branches: [],
        commits: [],
      });

      const result = await runSync(config, args);

      // Should have processed both repos but only synced one
      expect(result.gitReposProcessed).toBe(2);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(
        result.errors.some((e) => e.includes("Permission denied"))
      ).toBe(true);
    });
  });

  // ===========================================================================
  // Workspace/Session Sync Tests
  // ===========================================================================

  describe("workspace discovery", () => {
    it("should discover workspaces", async () => {
      vi.mocked(discoverWorkspaces).mockResolvedValue([
        {
          originalPath: "/home/user/project",
          claudePath: "/home/user/.claude/projects/abc123",
          sessions: [],
        },
      ]);

      vi.mocked(buildSyncWorkspace).mockResolvedValue({
        host: "test-host",
        cwd: "/home/user/project",
        claudeProjectPath: "/home/user/.claude/projects/abc123",
        sessions: [
          {
            originalSessionId: "session-1",
            agentId: null,
            parentOriginalSessionId: null,
            filename: "session-1.jsonl",
            entries: [
              {
                originalUuid: "entry-1",
                lineNumber: 1,
                type: "user",
                subtype: null,
                timestamp: "2024-01-01T00:00:00Z",
                data: { content: "Hello" },
              },
            ],
          },
        ],
      });

      const result = await runSync(config, baseArgs);

      expect(discoverWorkspaces).toHaveBeenCalled();
      expect(result.workspacesProcessed).toBe(1);
      expect(result.workspacesSynced).toBe(1);
      expect(result.sessionsFound).toBe(1);
      expect(result.entriesFound).toBe(1);
    });

    it("should not sync workspaces with no new entries", async () => {
      vi.mocked(discoverWorkspaces).mockResolvedValue([
        {
          originalPath: "/home/user/project",
          claudePath: "/home/user/.claude/projects/abc123",
          sessions: [],
        },
      ]);

      vi.mocked(buildSyncWorkspace).mockResolvedValue({
        host: "test-host",
        cwd: "/home/user/project",
        claudeProjectPath: "/home/user/.claude/projects/abc123",
        sessions: [], // No sessions with new entries
      });

      const result = await runSync(config, baseArgs);

      expect(result.workspacesProcessed).toBe(1);
      expect(result.workspacesSynced).toBe(0);
      expect(result.sessionsFound).toBe(0);
    });

    it("should handle workspace errors gracefully", async () => {
      vi.mocked(discoverWorkspaces).mockResolvedValue([
        {
          originalPath: "/home/user/project1",
          claudePath: "/home/user/.claude/projects/abc123",
          sessions: [],
        },
        {
          originalPath: "/home/user/project2",
          claudePath: "/home/user/.claude/projects/def456",
          sessions: [],
        },
      ]);

      vi.mocked(buildSyncWorkspace)
        .mockRejectedValueOnce(new Error("Read error"))
        .mockResolvedValueOnce({
          host: "test-host",
          cwd: "/home/user/project2",
          claudeProjectPath: "/home/user/.claude/projects/def456",
          sessions: [],
        });

      const result = await runSync(config, baseArgs);

      expect(result.workspacesProcessed).toBe(2);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors.some((e) => e.includes("Read error"))).toBe(true);
    });
  });

  // ===========================================================================
  // Sync Data Transmission Tests
  // ===========================================================================

  describe("sync data transmission", () => {
    it("should send sync data when there are changes", async () => {
      vi.mocked(discoverWorkspaces).mockResolvedValue([
        {
          originalPath: "/home/user/project",
          claudePath: "/home/user/.claude/projects/abc123",
          sessions: [],
        },
      ]);

      vi.mocked(buildSyncWorkspace).mockResolvedValue({
        host: "test-host",
        cwd: "/home/user/project",
        claudeProjectPath: "/home/user/.claude/projects/abc123",
        sessions: [
          {
            originalSessionId: "session-1",
            agentId: null,
            parentOriginalSessionId: null,
            filename: "session-1.jsonl",
            entries: [
              {
                originalUuid: "entry-1",
                lineNumber: 1,
                type: "user",
                subtype: null,
                timestamp: "2024-01-01T00:00:00Z",
                data: { content: "Hello" },
              },
            ],
          },
        ],
      });

      // Clear and recreate mock with sync call tracking
      vi.mocked(ApiClient).mockClear();
      const syncClient = {
        register: vi.fn().mockResolvedValue({
          id: "test-id",
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
        heartbeat: vi.fn().mockResolvedValue(undefined),
        getSessionState: vi.fn().mockResolvedValue({ sessions: [] }),
        getCommitState: vi.fn().mockResolvedValue({ knownShas: [] }),
        sync: vi.fn().mockResolvedValue({
          projectsCreated: 1,
          projectsUpdated: 0,
          gitReposCreated: 0,
          gitReposUpdated: 0,
          workspacesCreated: 1,
          workspacesUpdated: 0,
          sessionsCreated: 1,
          sessionsUpdated: 0,
          entriesCreated: 1,
          commitsCreated: 0,
          branchesCreated: 0,
          branchesUpdated: 0,
        }),
      };
      vi.mocked(ApiClient).mockReturnValue(syncClient as any);

      const result = await runSync(config, baseArgs);

      expect(syncClient.sync).toHaveBeenCalled();
      expect(result.errors).toHaveLength(0);
    });

    it("should not send sync data when there are no changes", async () => {
      vi.mocked(discoverWorkspaces).mockResolvedValue([]);

      // Clear and recreate mock
      vi.mocked(ApiClient).mockClear();
      const noChangeClient = {
        register: vi.fn().mockResolvedValue({
          id: "test-id",
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
        heartbeat: vi.fn().mockResolvedValue(undefined),
        getSessionState: vi.fn().mockResolvedValue({ sessions: [] }),
        getCommitState: vi.fn().mockResolvedValue({ knownShas: [] }),
        sync: vi.fn(),
      };
      vi.mocked(ApiClient).mockReturnValue(noChangeClient as any);

      await runSync(config, baseArgs);

      // Sync should not be called when there's nothing to sync
      expect(noChangeClient.sync).not.toHaveBeenCalled();
    });

    it("should handle sync errors", async () => {
      vi.mocked(discoverWorkspaces).mockResolvedValue([
        {
          originalPath: "/home/user/project",
          claudePath: "/home/user/.claude/projects/abc123",
          sessions: [],
        },
      ]);

      vi.mocked(buildSyncWorkspace).mockResolvedValue({
        host: "test-host",
        cwd: "/home/user/project",
        claudeProjectPath: "/home/user/.claude/projects/abc123",
        sessions: [
          {
            originalSessionId: "session-1",
            agentId: null,
            parentOriginalSessionId: null,
            filename: "session-1.jsonl",
            entries: [
              {
                originalUuid: "entry-1",
                lineNumber: 1,
                type: "user",
                subtype: null,
                timestamp: "2024-01-01T00:00:00Z",
                data: { content: "Hello" },
              },
            ],
          },
        ],
      });

      // Clear and recreate mock with failing sync
      vi.mocked(ApiClient).mockClear();
      const failingSyncClient = {
        register: vi.fn().mockResolvedValue({
          id: "test-id",
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
        heartbeat: vi.fn().mockResolvedValue(undefined),
        getSessionState: vi.fn().mockResolvedValue({ sessions: [] }),
        getCommitState: vi.fn().mockResolvedValue({ knownShas: [] }),
        sync: vi.fn().mockRejectedValue(new Error("Server error")),
      };
      vi.mocked(ApiClient).mockReturnValue(failingSyncClient as any);

      const result = await runSync(config, baseArgs);

      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      // With batch sync, errors are per-workspace now
      expect(result.errors.some((e) => e.includes("Workspace") && e.includes("Server error"))).toBe(true);
    });
  });

  // ===========================================================================
  // Dry Run Mode Tests
  // ===========================================================================

  describe("dry-run mode", () => {
    it("should skip API calls in dry-run mode", async () => {
      const args: CliArgs = { ...baseArgs, dryRun: true };

      vi.mocked(discoverWorkspaces).mockResolvedValue([
        {
          originalPath: "/home/user/project",
          claudePath: "/home/user/.claude/projects/abc123",
          sessions: [],
        },
      ]);

      vi.mocked(buildSyncWorkspace).mockResolvedValue({
        host: "test-host",
        cwd: "/home/user/project",
        claudeProjectPath: "/home/user/.claude/projects/abc123",
        sessions: [
          {
            originalSessionId: "session-1",
            agentId: null,
            parentOriginalSessionId: null,
            filename: "session-1.jsonl",
            entries: [
              {
                originalUuid: "entry-1",
                lineNumber: 1,
                type: "user",
                subtype: null,
                timestamp: "2024-01-01T00:00:00Z",
                data: { content: "Hello" },
              },
            ],
          },
        ],
      });

      // Clear and recreate mock to track calls
      vi.mocked(ApiClient).mockClear();
      const dryRunClient = {
        register: vi.fn(),
        heartbeat: vi.fn(),
        getSessionState: vi.fn(),
        getCommitState: vi.fn(),
        sync: vi.fn(),
      };
      vi.mocked(ApiClient).mockReturnValue(dryRunClient as any);

      const result = await runSync(config, args);

      expect(result.dryRun).toBe(true);
      // API calls should not be made in dry-run mode
      expect(dryRunClient.register).not.toHaveBeenCalled();
      expect(dryRunClient.sync).not.toHaveBeenCalled();
    });

    it("should still discover and analyze data in dry-run mode", async () => {
      const args: CliArgs = {
        ...baseArgs,
        dryRun: true,
        sourceDirs: ["/home/user/projects"],
      };

      vi.mocked(discoverGitRepos).mockResolvedValue([
        {
          path: "/home/user/projects/repo1",
          upstreamUrl: "github.com/user/repo1",
          defaultBranch: "main",
          currentBranch: "main",
          headSha: "abc123",
          isDirty: true,
          dirtyFilesCount: 1,
          dirtySnapshot: null,
          lastFileChangeAt: null,
        },
      ]);

      vi.mocked(extractBranches).mockResolvedValue([
        {
          name: "main",
          headSha: "abc123",
          upstreamName: null,
          upstreamSha: null,
          aheadCount: 0,
          behindCount: 0,
          lastCommitAt: null,
        },
      ]);

      vi.mocked(extractCommits).mockResolvedValue([]);

      vi.mocked(buildSyncGitRepo).mockReturnValue({
        host: "test-host",
        path: "/home/user/projects/repo1",
        upstreamUrl: "github.com/user/repo1",
        defaultBranch: "main",
        currentBranch: "main",
        headSha: "abc123",
        isDirty: true,
        dirtyFilesCount: 1,
        dirtySnapshot: null,
        lastFileChangeAt: null,
        branches: [],
        commits: [],
      });

      vi.mocked(discoverWorkspaces).mockResolvedValue([]);

      const result = await runSync(config, args);

      // Should still discover repos even in dry-run mode
      expect(discoverGitRepos).toHaveBeenCalled();
      expect(discoverWorkspaces).toHaveBeenCalled();
      expect(result.gitReposProcessed).toBe(1);
      expect(result.gitReposSynced).toBe(1);
    });
  });

  // ===========================================================================
  // Result Structure Tests
  // ===========================================================================

  describe("result structure", () => {
    it("should return correct SyncResult structure", async () => {
      const result = await runSync(config, baseArgs);

      expect(result).toHaveProperty("syncRunId");
      expect(result).toHaveProperty("gitReposProcessed");
      expect(result).toHaveProperty("gitReposSynced");
      expect(result).toHaveProperty("commitsFound");
      expect(result).toHaveProperty("workspacesProcessed");
      expect(result).toHaveProperty("workspacesSynced");
      expect(result).toHaveProperty("sessionsFound");
      expect(result).toHaveProperty("entriesFound");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("dryRun");

      expect(typeof result.syncRunId).toBe("string");
      expect(typeof result.gitReposProcessed).toBe("number");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(typeof result.dryRun).toBe("boolean");
    });

    it("should generate a valid UUID for syncRunId", async () => {
      const result = await runSync(config, baseArgs);

      // UUID v4 format
      expect(result.syncRunId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });
});
