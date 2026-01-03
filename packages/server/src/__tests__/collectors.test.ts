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
