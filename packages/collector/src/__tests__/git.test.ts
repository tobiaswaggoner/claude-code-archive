import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import {
  normalizeUpstreamUrl,
  parseGitLogOutput,
  parseBranchOutput,
  buildSyncGitRepo,
  discoverGitRepos,
  extractBranches,
  extractCommits,
  extractGitInfo,
  type GitRepoInfo,
} from "../sync/git.js";

vi.mock("node:child_process");
vi.mock("node:fs");

describe("normalizeUpstreamUrl", () => {
  it("should normalize git@github.com:user/repo.git format", () => {
    expect(normalizeUpstreamUrl("git@github.com:user/repo.git")).toBe(
      "github.com/user/repo"
    );
  });

  it("should normalize https://github.com/user/repo.git format", () => {
    expect(normalizeUpstreamUrl("https://github.com/user/repo.git")).toBe(
      "github.com/user/repo"
    );
  });

  it("should normalize https://github.com/user/repo format (no .git)", () => {
    expect(normalizeUpstreamUrl("https://github.com/user/repo")).toBe(
      "github.com/user/repo"
    );
  });

  it("should normalize http:// URLs", () => {
    expect(normalizeUpstreamUrl("http://github.com/user/repo.git")).toBe(
      "github.com/user/repo"
    );
  });

  it("should lowercase the URL", () => {
    expect(normalizeUpstreamUrl("git@GitHub.Com:User/Repo.git")).toBe(
      "github.com/user/repo"
    );
  });

  it("should handle GitLab URLs", () => {
    expect(normalizeUpstreamUrl("git@gitlab.com:org/project.git")).toBe(
      "gitlab.com/org/project"
    );
  });

  it("should handle nested paths", () => {
    expect(
      normalizeUpstreamUrl("git@github.com:org/sub/repo.git")
    ).toBe("github.com/org/sub/repo");
  });

  it("should handle Bitbucket URLs", () => {
    expect(
      normalizeUpstreamUrl("https://bitbucket.org/team/repo.git")
    ).toBe("bitbucket.org/team/repo");
  });
});

describe("parseGitLogOutput", () => {
  it("should parse commit log output correctly", () => {
    const output = [
      "abc123|Initial commit|John Doe|john@example.com|2024-01-15T10:30:00+00:00|John Doe|2024-01-15T10:30:00+00:00|",
      "def456|Add feature|Jane Smith|jane@example.com|2024-01-16T11:00:00+00:00|Jane Smith|2024-01-16T11:00:00+00:00|abc123",
    ].join("\n");

    const commits = parseGitLogOutput(output, new Set());

    expect(commits).toHaveLength(2);
    // Dates are normalized to ISO 8601 format with .000Z
    expect(commits[0]).toEqual({
      sha: "abc123",
      message: "Initial commit",
      authorName: "John Doe",
      authorEmail: "john@example.com",
      authorDate: "2024-01-15T10:30:00.000Z",
      committerName: "John Doe",
      committerDate: "2024-01-15T10:30:00.000Z",
      parentShas: [],
    });
    expect(commits[1]).toEqual({
      sha: "def456",
      message: "Add feature",
      authorName: "Jane Smith",
      authorEmail: "jane@example.com",
      authorDate: "2024-01-16T11:00:00.000Z",
      committerName: "Jane Smith",
      committerDate: "2024-01-16T11:00:00.000Z",
      parentShas: ["abc123"],
    });
  });

  it("should handle merge commits with multiple parents", () => {
    const output =
      "abc123|Merge branch|John|john@ex.com|2024-01-15T10:00:00Z|John|2024-01-15T10:00:00Z|parent1 parent2";

    const commits = parseGitLogOutput(output, new Set());

    expect(commits).toHaveLength(1);
    expect(commits[0].parentShas).toEqual(["parent1", "parent2"]);
  });

  it("should filter out known SHAs", () => {
    const output = [
      "abc123|Commit 1|John|john@ex.com|2024-01-15T10:00:00Z|John|2024-01-15T10:00:00Z|",
      "def456|Commit 2|John|john@ex.com|2024-01-16T10:00:00Z|John|2024-01-16T10:00:00Z|abc123",
      "ghi789|Commit 3|John|john@ex.com|2024-01-17T10:00:00Z|John|2024-01-17T10:00:00Z|def456",
    ].join("\n");

    const knownShas = new Set(["abc123", "ghi789"]);
    const commits = parseGitLogOutput(output, knownShas);

    expect(commits).toHaveLength(1);
    expect(commits[0].sha).toBe("def456");
  });

  it("should handle empty output", () => {
    const commits = parseGitLogOutput("", new Set());
    expect(commits).toHaveLength(0);
  });

  it("should skip malformed lines", () => {
    const output = [
      "abc123|Good commit|John|john@ex.com|2024-01-15T10:00:00Z|John|2024-01-15T10:00:00Z|",
      "incomplete|line",
      "",
      "def456|Another good|Jane|jane@ex.com|2024-01-16T10:00:00Z|Jane|2024-01-16T10:00:00Z|abc123",
    ].join("\n");

    const commits = parseGitLogOutput(output, new Set());

    expect(commits).toHaveLength(2);
    expect(commits[0].sha).toBe("abc123");
    expect(commits[1].sha).toBe("def456");
  });

  it("should handle null committer fields", () => {
    const output = "abc123|Commit|John|john@ex.com|2024-01-15T10:00:00Z|||";

    const commits = parseGitLogOutput(output, new Set());

    expect(commits).toHaveLength(1);
    expect(commits[0].committerName).toBeNull();
    expect(commits[0].committerDate).toBeNull();
  });
});

describe("parseBranchOutput", () => {
  it("should parse branch output correctly", () => {
    const output = [
      "main|origin/main|[ahead 2, behind 1]",
      "feature/x|origin/feature/x|[ahead 3]",
      "local-only||",
    ].join("\n");

    const branchShas = new Map([
      ["main", "sha1"],
      ["feature/x", "sha2"],
      ["local-only", "sha3"],
    ]);

    const upstreamShas = new Map([
      ["origin/main", "upstream1"],
      ["origin/feature/x", "upstream2"],
    ]);

    const branchCommitDates = new Map([
      ["main", "2024-01-15T10:00:00Z"],
      ["feature/x", "2024-01-16T10:00:00Z"],
      ["local-only", "2024-01-17T10:00:00Z"],
    ]);

    const branches = parseBranchOutput(
      output,
      branchShas,
      upstreamShas,
      branchCommitDates
    );

    expect(branches).toHaveLength(3);

    expect(branches[0]).toEqual({
      name: "main",
      headSha: "sha1",
      upstreamName: "origin/main",
      upstreamSha: "upstream1",
      aheadCount: 2,
      behindCount: 1,
      lastCommitAt: "2024-01-15T10:00:00Z",
    });

    expect(branches[1]).toEqual({
      name: "feature/x",
      headSha: "sha2",
      upstreamName: "origin/feature/x",
      upstreamSha: "upstream2",
      aheadCount: 3,
      behindCount: 0,
      lastCommitAt: "2024-01-16T10:00:00Z",
    });

    expect(branches[2]).toEqual({
      name: "local-only",
      headSha: "sha3",
      upstreamName: null,
      upstreamSha: null,
      aheadCount: 0,
      behindCount: 0,
      lastCommitAt: "2024-01-17T10:00:00Z",
    });
  });

  it("should handle behind only", () => {
    const output = "main|origin/main|[behind 5]";
    const branchShas = new Map([["main", "sha1"]]);
    const upstreamShas = new Map([["origin/main", "upstream1"]]);
    const branchCommitDates = new Map<string, string>();

    const branches = parseBranchOutput(
      output,
      branchShas,
      upstreamShas,
      branchCommitDates
    );

    expect(branches[0].aheadCount).toBe(0);
    expect(branches[0].behindCount).toBe(5);
  });

  it("should handle quoted output from git", () => {
    const output = "'main|origin/main|'";
    const branchShas = new Map([["main", "sha1"]]);
    const upstreamShas = new Map([["origin/main", "upstream1"]]);
    const branchCommitDates = new Map<string, string>();

    const branches = parseBranchOutput(
      output,
      branchShas,
      upstreamShas,
      branchCommitDates
    );

    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe("main");
  });

  it("should skip branches without SHA", () => {
    const output = [
      "main|origin/main|",
      "missing||",
    ].join("\n");

    const branchShas = new Map([["main", "sha1"]]);
    const upstreamShas = new Map<string, string>();
    const branchCommitDates = new Map<string, string>();

    const branches = parseBranchOutput(
      output,
      branchShas,
      upstreamShas,
      branchCommitDates
    );

    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe("main");
  });

  it("should handle empty output", () => {
    const branches = parseBranchOutput(
      "",
      new Map(),
      new Map(),
      new Map()
    );
    expect(branches).toHaveLength(0);
  });
});

describe("buildSyncGitRepo", () => {
  it("should combine info, branches, and commits into sync payload", () => {
    const info: GitRepoInfo = {
      path: "/home/user/project",
      upstreamUrl: "github.com/user/project",
      defaultBranch: "main",
      currentBranch: "feature/x",
      headSha: "abc123",
      isDirty: true,
      dirtyFilesCount: 2,
      dirtySnapshot: {
        status: " M file1.ts\n?? file2.ts",
        files: [
          { path: "file1.ts", status: "M", mtime: "2024-01-15T10:00:00Z" },
          { path: "file2.ts", status: "??", mtime: "2024-01-15T11:00:00Z" },
        ],
        capturedAt: "2024-01-15T12:00:00Z",
      },
      lastFileChangeAt: "2024-01-15T11:00:00Z",
    };

    const branches = [
      {
        name: "main",
        headSha: "sha1",
        upstreamName: "origin/main",
        upstreamSha: "upstream1",
        aheadCount: 0,
        behindCount: 0,
        lastCommitAt: "2024-01-14T10:00:00Z",
      },
    ];

    const commits = [
      {
        sha: "abc123",
        message: "Feature work",
        authorName: "John Doe",
        authorEmail: "john@example.com",
        authorDate: "2024-01-15T10:00:00Z",
        committerName: "John Doe",
        committerDate: "2024-01-15T10:00:00Z",
        parentShas: ["sha1"],
      },
    ];

    const result = buildSyncGitRepo(info, branches, commits);

    expect(result.path).toBe("/home/user/project");
    expect(result.upstreamUrl).toBe("github.com/user/project");
    expect(result.defaultBranch).toBe("main");
    expect(result.currentBranch).toBe("feature/x");
    expect(result.headSha).toBe("abc123");
    expect(result.isDirty).toBe(true);
    expect(result.dirtyFilesCount).toBe(2);
    expect(result.dirtySnapshot).toEqual(info.dirtySnapshot);
    expect(result.lastFileChangeAt).toBe("2024-01-15T11:00:00Z");
    expect(result.branches).toEqual(branches);
    expect(result.commits).toEqual(commits);
    expect(result.host).toBeTruthy(); // hostname() returns something
  });

  it("should handle clean repo", () => {
    const info: GitRepoInfo = {
      path: "/home/user/project",
      upstreamUrl: null,
      defaultBranch: null,
      currentBranch: "main",
      headSha: "abc123",
      isDirty: false,
      dirtyFilesCount: null,
      dirtySnapshot: null,
      lastFileChangeAt: null,
    };

    const result = buildSyncGitRepo(info, [], []);

    expect(result.isDirty).toBe(false);
    expect(result.dirtyFilesCount).toBeNull();
    expect(result.dirtySnapshot).toBeNull();
    expect(result.lastFileChangeAt).toBeNull();
    expect(result.branches).toEqual([]);
    expect(result.commits).toEqual([]);
  });
});

describe("discoverGitRepos", () => {
  const mockExecSync = vi.mocked(childProcess.execSync);
  const mockReaddirSync = vi.mocked(fs.readdirSync);
  const mockStatSync = vi.mocked(fs.statSync);
  const mockExistsSync = vi.mocked(fs.existsSync);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should discover git repos in search paths", async () => {
    // Setup: /home/user/src contains two subdirs, one is a git repo
    mockExistsSync.mockImplementation((path) => {
      const p = path.toString();
      if (p === "/home/user/src") return true;
      if (p === "/home/user/src/.git") return false;
      if (p === "/home/user/src/project-a/.git") return true;
      if (p === "/home/user/src/project-b/.git") return false;
      if (p === "/home/user/src/project-b/subdir/.git") return false;
      return false;
    });

    mockReaddirSync.mockImplementation((path) => {
      const p = path.toString();
      if (p === "/home/user/src") return ["project-a", "project-b"] as unknown as fs.Dirent[];
      if (p === "/home/user/src/project-b") return ["subdir"] as unknown as fs.Dirent[];
      return [] as unknown as fs.Dirent[];
    });

    mockStatSync.mockImplementation(() => ({
      isDirectory: () => true,
    }) as fs.Stats);

    // Mock git commands for project-a
    mockExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes("rev-parse HEAD")) return "abc123\n";
      if (cmdStr.includes("remote get-url origin")) return "git@github.com:user/project-a.git\n";
      if (cmdStr.includes("branch --show-current")) return "main\n";
      if (cmdStr.includes("symbolic-ref")) return "refs/remotes/origin/main\n";
      if (cmdStr.includes("status --porcelain")) return "";
      return "";
    });

    const repos = await discoverGitRepos(["/home/user/src"]);

    expect(repos).toHaveLength(1);
    expect(repos[0].path).toBe("/home/user/src/project-a");
    expect(repos[0].upstreamUrl).toBe("github.com/user/project-a");
  });

  it("should skip node_modules and other ignored directories", async () => {
    mockExistsSync.mockImplementation((path) => {
      const p = path.toString();
      if (p === "/home/user/src") return true;
      if (p === "/home/user/src/.git") return false;
      return false;
    });

    mockReaddirSync.mockImplementation((path) => {
      const p = path.toString();
      if (p === "/home/user/src") {
        return [
          "node_modules",
          "vendor",
          "__pycache__",
          ".cache",
          "real-project",
        ] as unknown as fs.Dirent[];
      }
      return [] as unknown as fs.Dirent[];
    });

    mockStatSync.mockImplementation(() => ({
      isDirectory: () => true,
    }) as fs.Stats);

    await discoverGitRepos(["/home/user/src"]);

    // Should not have tried to read node_modules, vendor, etc.
    const readdirCalls = mockReaddirSync.mock.calls.map((c) => c[0].toString());
    expect(readdirCalls).not.toContain("/home/user/src/node_modules");
    expect(readdirCalls).not.toContain("/home/user/src/vendor");
    expect(readdirCalls).not.toContain("/home/user/src/__pycache__");
    expect(readdirCalls).not.toContain("/home/user/src/.cache");
  });

  it("should handle non-existent search paths", async () => {
    mockExistsSync.mockReturnValue(false);

    const repos = await discoverGitRepos(["/does/not/exist"]);

    expect(repos).toHaveLength(0);
  });

  it("should detect when search path itself is a git repo", async () => {
    mockExistsSync.mockImplementation((path) => {
      const p = path.toString();
      if (p === "/home/user/project") return true;
      if (p === "/home/user/project/.git") return true;
      return false;
    });

    mockExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes("rev-parse HEAD")) return "abc123\n";
      if (cmdStr.includes("remote get-url origin")) return "git@github.com:user/project.git\n";
      if (cmdStr.includes("branch --show-current")) return "main\n";
      if (cmdStr.includes("symbolic-ref")) return "refs/remotes/origin/main\n";
      if (cmdStr.includes("status --porcelain")) return "";
      return "";
    });

    const repos = await discoverGitRepos(["/home/user/project"]);

    expect(repos).toHaveLength(1);
    expect(repos[0].path).toBe("/home/user/project");
  });
});

describe("extractGitInfo", () => {
  const mockExecSync = vi.mocked(childProcess.execSync);
  const mockExistsSync = vi.mocked(fs.existsSync);
  const mockStatSync = vi.mocked(fs.statSync);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should extract complete git info from repo", () => {
    mockExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes("rev-parse HEAD")) return "abc123def456\n";
      if (cmdStr.includes("remote get-url origin")) return "git@github.com:user/repo.git\n";
      if (cmdStr.includes("branch --show-current")) return "feature/new-thing\n";
      if (cmdStr.includes("symbolic-ref")) return "refs/remotes/origin/main\n";
      if (cmdStr.includes("status --porcelain")) return " M src/index.ts\n?? temp.txt\n";
      return "";
    });

    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({
      mtime: new Date("2024-01-15T10:00:00Z"),
    } as fs.Stats);

    const info = extractGitInfo("/home/user/repo");

    expect(info).not.toBeNull();
    expect(info!.path).toBe("/home/user/repo");
    expect(info!.headSha).toBe("abc123def456");
    expect(info!.upstreamUrl).toBe("github.com/user/repo");
    expect(info!.currentBranch).toBe("feature/new-thing");
    expect(info!.defaultBranch).toBe("main");
    expect(info!.isDirty).toBe(true);
    expect(info!.dirtyFilesCount).toBe(2);
    expect(info!.dirtySnapshot).not.toBeNull();
    expect(info!.dirtySnapshot!.files).toHaveLength(2);
  });

  it("should return null for non-git directory", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("Not a git repo");
    });

    const info = extractGitInfo("/home/user/not-a-repo");

    expect(info).toBeNull();
  });

  it("should handle repo without origin remote", () => {
    mockExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes("rev-parse HEAD")) return "abc123\n";
      if (cmdStr.includes("remote get-url origin")) throw new Error("No origin");
      if (cmdStr.includes("branch --show-current")) return "main\n";
      if (cmdStr.includes("symbolic-ref")) throw new Error("No ref");
      if (cmdStr.includes("branch -a")) return "* main\n";
      if (cmdStr.includes("status --porcelain")) return "";
      return "";
    });

    const info = extractGitInfo("/home/user/local-repo");

    expect(info).not.toBeNull();
    expect(info!.upstreamUrl).toBeNull();
    expect(info!.defaultBranch).toBe("main");
  });

  it("should detect clean repo state", () => {
    mockExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes("rev-parse HEAD")) return "abc123\n";
      if (cmdStr.includes("remote get-url origin")) return "git@github.com:user/repo.git\n";
      if (cmdStr.includes("branch --show-current")) return "main\n";
      if (cmdStr.includes("symbolic-ref")) return "refs/remotes/origin/main\n";
      if (cmdStr.includes("status --porcelain")) return "";
      return "";
    });

    const info = extractGitInfo("/home/user/clean-repo");

    expect(info!.isDirty).toBe(false);
    expect(info!.dirtyFilesCount).toBe(0);
    expect(info!.dirtySnapshot).toBeNull();
  });
});

describe("extractBranches", () => {
  const mockExecSync = vi.mocked(childProcess.execSync);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should extract all branches with tracking info", async () => {
    mockExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes("for-each-ref")) {
        return "main|origin/main|[ahead 1]\nfeature/x|origin/feature/x|[behind 2]\nlocal||\n";
      }
      if (cmdStr.includes("rev-parse main")) return "sha1\n";
      if (cmdStr.includes("rev-parse feature/x")) return "sha2\n";
      if (cmdStr.includes("rev-parse local")) return "sha3\n";
      if (cmdStr.includes("rev-parse origin/main")) return "upsha1\n";
      if (cmdStr.includes("rev-parse origin/feature/x")) return "upsha2\n";
      if (cmdStr.includes("log -1 --format=%aI main")) return "2024-01-15T10:00:00Z\n";
      if (cmdStr.includes("log -1 --format=%aI feature/x")) return "2024-01-16T10:00:00Z\n";
      if (cmdStr.includes("log -1 --format=%aI local")) return "2024-01-17T10:00:00Z\n";
      return "";
    });

    const branches = await extractBranches("/home/user/repo");

    expect(branches).toHaveLength(3);
    expect(branches[0].name).toBe("main");
    expect(branches[0].aheadCount).toBe(1);
    expect(branches[0].upstreamName).toBe("origin/main");
    expect(branches[1].behindCount).toBe(2);
    expect(branches[2].upstreamName).toBeNull();
  });

  it("should return empty array on error", async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("Git error");
    });

    const branches = await extractBranches("/home/user/broken-repo");

    expect(branches).toEqual([]);
  });
});

describe("extractCommits", () => {
  const mockExecSync = vi.mocked(childProcess.execSync);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should extract commits excluding known SHAs", async () => {
    const logOutput = [
      "abc123|First|John|john@ex.com|2024-01-15T10:00:00Z|John|2024-01-15T10:00:00Z|",
      "def456|Second|Jane|jane@ex.com|2024-01-16T10:00:00Z|Jane|2024-01-16T10:00:00Z|abc123",
      "ghi789|Third|John|john@ex.com|2024-01-17T10:00:00Z|John|2024-01-17T10:00:00Z|def456",
    ].join("\n");

    mockExecSync.mockReturnValue(logOutput);

    const knownShas = new Set(["abc123"]);
    const commits = await extractCommits("/home/user/repo", knownShas);

    expect(commits).toHaveLength(2);
    expect(commits[0].sha).toBe("def456");
    expect(commits[1].sha).toBe("ghi789");
  });

  it("should respect limit parameter", async () => {
    mockExecSync.mockReturnValue("");

    await extractCommits("/home/user/repo", new Set(), 50);

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining("-n 50"),
      expect.any(Object)
    );
  });

  it("should use default limit of 1000", async () => {
    mockExecSync.mockReturnValue("");

    await extractCommits("/home/user/repo", new Set());

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining("-n 1000"),
      expect.any(Object)
    );
  });

  it("should return empty array on error", async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("Git error");
    });

    const commits = await extractCommits("/home/user/broken-repo", new Set());

    expect(commits).toEqual([]);
  });
});
