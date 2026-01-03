import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock the database module before importing routes
vi.mock("../db/connection.js", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// Import after mocking
import { db } from "../db/connection.js";
import { createCollectorRoutes } from "../routes/collectors.js";

describe("Collector State Endpoints", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/", createCollectorRoutes());
  });

  describe("GET /collectors/{id}/session-state", () => {
    const collectorId = "00000000-0000-0000-0000-000000000001";
    const workspaceId = "00000000-0000-0000-0000-000000000002";

    it("returns empty sessions array when workspace not found", async () => {
      // Mock workspace query returning empty array
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([]);
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      });
      mockFrom.mockReturnValue({ where: mockWhere });

      const res = await app.request(
        `/collectors/${collectorId}/session-state?host=myhost&cwd=/path/to/project`
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ sessions: [] });
    });

    it("returns sessions with entry counts and last line numbers", async () => {
      // First call returns workspace
      const workspaceResult = [{ id: workspaceId }];

      // Second call returns sessions
      const sessionsResult = [
        { originalSessionId: "session-1", entryCount: 10 },
        { originalSessionId: "session-2", entryCount: 5 },
      ];

      // Third+ calls return max line numbers
      const maxLineResults = [
        [{ maxLineNumber: 10 }],
        [{ maxLineNumber: 5 }],
      ];

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        const call = callCount++;
        if (call === 0) {
          // Workspace query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(workspaceResult),
            }),
          };
        } else if (call === 1) {
          // Sessions query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(sessionsResult),
            }),
          };
        } else {
          // Max line number queries
          const lineResult = maxLineResults[call - 2] || [{ maxLineNumber: 0 }];
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(lineResult),
              }),
            }),
          };
        }
      });

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const res = await app.request(
        `/collectors/${collectorId}/session-state?host=myhost&cwd=/path/to/project`
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        sessions: [
          { originalSessionId: "session-1", entryCount: 10, lastLineNumber: 10 },
          { originalSessionId: "session-2", entryCount: 5, lastLineNumber: 5 },
        ],
      });
    });

    it("requires host query parameter", async () => {
      const res = await app.request(
        `/collectors/${collectorId}/session-state?cwd=/path/to/project`
      );

      expect(res.status).toBe(400);
    });

    it("requires cwd query parameter", async () => {
      const res = await app.request(
        `/collectors/${collectorId}/session-state?host=myhost`
      );

      expect(res.status).toBe(400);
    });
  });

  describe("GET /collectors/{id}/commit-state", () => {
    const collectorId = "00000000-0000-0000-0000-000000000001";
    const projectId = "00000000-0000-0000-0000-000000000003";

    it("returns empty knownShas array when git repo not found", async () => {
      // Mock git_repo query returning empty array
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([]);
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      });
      mockFrom.mockReturnValue({ where: mockWhere });

      const res = await app.request(
        `/collectors/${collectorId}/commit-state?host=my-host&path=/home/user/repo`
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ knownShas: [] });
    });

    it("returns known commit SHAs for a git repo", async () => {
      // First call returns git_repo
      const gitRepoResult = [{ id: "repo-id", projectId: projectId }];

      // Second call returns commits
      const commitsResult = [
        { sha: "abc123" },
        { sha: "def456" },
        { sha: "ghi789" },
      ];

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        const call = callCount++;
        if (call === 0) {
          // git_repo query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(gitRepoResult),
            }),
          };
        } else {
          // Commits query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(commitsResult),
            }),
          };
        }
      });

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const res = await app.request(
        `/collectors/${collectorId}/commit-state?host=my-host&path=/home/user/repo`
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        knownShas: ["abc123", "def456", "ghi789"],
      });
    });

    it("requires host and path query parameters", async () => {
      const res = await app.request(
        `/collectors/${collectorId}/commit-state`
      );

      expect(res.status).toBe(400);
    });
  });

  describe("GET /collectors/{id}/sync-state", () => {
    const collectorId = "00000000-0000-0000-0000-000000000001";

    it("returns empty state when no repos or workspaces found", async () => {
      // Mock both git_repo and workspace queries returning empty arrays
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([]);
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
        where: mockWhere,
      });
      mockFrom.mockReturnValue({ where: mockWhere });

      const res = await app.request(
        `/collectors/${collectorId}/sync-state?host=myhost`
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ gitRepos: {}, workspaces: {} });
    });

    it("returns combined state for git repos and workspaces", async () => {
      // Setup mock data
      const gitReposResult = [
        { id: "repo-1", path: "/home/user/repo1", projectId: "project-1" },
        { id: "repo-2", path: "/home/user/repo2", projectId: "project-2" },
      ];
      const commitsRepo1 = [{ sha: "abc123" }, { sha: "def456" }];
      const commitsRepo2 = [{ sha: "ghi789" }];

      const workspacesResult = [
        { id: "ws-1", cwd: "/home/user/project1" },
      ];
      const sessionsResult = [
        { originalSessionId: "session-1", entryCount: 10 },
      ];
      const maxLineResult = [{ maxLineNumber: 10 }];

      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        const call = callCount++;
        if (call === 0) {
          // git_repo query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(gitReposResult),
            }),
          };
        } else if (call === 1) {
          // commits for repo1
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(commitsRepo1),
            }),
          };
        } else if (call === 2) {
          // commits for repo2
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(commitsRepo2),
            }),
          };
        } else if (call === 3) {
          // workspaces query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(workspacesResult),
            }),
          };
        } else if (call === 4) {
          // sessions query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(sessionsResult),
            }),
          };
        } else {
          // max line number query
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(maxLineResult),
              }),
            }),
          };
        }
      });

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const res = await app.request(
        `/collectors/${collectorId}/sync-state?host=myhost`
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        gitRepos: {
          "/home/user/repo1": ["abc123", "def456"],
          "/home/user/repo2": ["ghi789"],
        },
        workspaces: {
          "/home/user/project1": [
            { originalSessionId: "session-1", entryCount: 10, lastLineNumber: 10 },
          ],
        },
      });
    });

    it("requires host query parameter", async () => {
      const res = await app.request(
        `/collectors/${collectorId}/sync-state`
      );

      expect(res.status).toBe(400);
    });
  });
});
