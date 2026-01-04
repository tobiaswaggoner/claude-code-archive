import { z } from "@hono/zod-openapi";

// Common schemas for API responses

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(1000).default(50).openapi({
    description: "Maximum number of items to return",
    example: 50,
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Number of items to skip",
    example: 0,
  }),
});

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc").openapi({
  description: "Sort order (ascending or descending)",
  example: "desc",
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  });

export const errorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

// Collector schemas
export const collectorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  hostname: z.string(),
  osInfo: z.string().nullable(),
  version: z.string().nullable(),
  config: z.record(z.unknown()).nullable(),
  registeredAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  lastSyncRunId: z.string().uuid().nullable(),
  lastSyncStatus: z.enum(["success", "error", "partial"]).nullable(),
  isActive: z.boolean(),
});

export const collectorRegisterSchema = z.object({
  id: z.string().uuid().openapi({ description: "Collector-generated UUID" }),
  name: z.string().min(1).openapi({ description: "Display name" }),
  hostname: z.string().min(1).openapi({ description: "OS hostname" }),
  osInfo: z.string().optional().openapi({ description: "OS details" }),
  version: z.string().optional().openapi({ description: "Collector version" }),
  config: z.record(z.unknown()).optional().openapi({ description: "Active configuration" }),
});

export const collectorHeartbeatSchema = z.object({
  syncRunId: z.string().uuid().optional(),
  syncStatus: z.enum(["success", "error", "partial"]).optional(),
});

// Project schemas
export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  upstreamUrl: z.string().nullable(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archived: z.boolean(),
});

// Session schemas
export const sessionSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  originalSessionId: z.string(),
  parentSessionId: z.string().uuid().nullable(),
  agentId: z.string().nullable(),
  filename: z.string(),
  firstEntryAt: z.string().datetime().nullable(),
  lastEntryAt: z.string().datetime().nullable(),
  entryCount: z.number(),
  summary: z.string().nullable(),
  modelsUsed: z.array(z.string()).nullable(),
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  syncedAt: z.string().datetime(),
});

// Entry schemas
export const entrySchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  originalUuid: z.string().uuid().nullable(),
  lineNumber: z.number(),
  type: z.string(),
  subtype: z.string().nullable(),
  timestamp: z.string().datetime().nullable(),
  data: z.record(z.unknown()),
});

// Git schemas
export const gitRepoSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  host: z.string(),
  path: z.string(),
  defaultBranch: z.string().nullable(),
  currentBranch: z.string().nullable(),
  headSha: z.string().nullable(),
  isDirty: z.boolean(),
  dirtyFilesCount: z.number().nullable(),
  lastScannedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const gitBranchSchema = z.object({
  id: z.string().uuid(),
  gitRepoId: z.string().uuid(),
  name: z.string(),
  headSha: z.string(),
  upstreamName: z.string().nullable(),
  upstreamSha: z.string().nullable(),
  aheadCount: z.number(),
  behindCount: z.number(),
  lastCommitAt: z.string().datetime().nullable(),
  discoveredAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  forcePushCount: z.number(),
});

// Sync data schemas (for collector bulk uploads)
export const syncGitRepoSchema = z.object({
  host: z.string(),
  path: z.string(),
  upstreamUrl: z.string().nullable(),
  defaultBranch: z.string().nullable(),
  currentBranch: z.string().nullable(),
  headSha: z.string().nullable(),
  isDirty: z.boolean(),
  dirtyFilesCount: z.number().nullable(),
  dirtySnapshot: z.record(z.unknown()).nullable(),
  lastFileChangeAt: z.string().datetime({ offset: true }).nullable(),
  branches: z.array(
    z.object({
      name: z.string(),
      headSha: z.string(),
      upstreamName: z.string().nullable(),
      upstreamSha: z.string().nullable(),
      aheadCount: z.number().default(0),
      behindCount: z.number().default(0),
      lastCommitAt: z.string().datetime({ offset: true }).nullable(),
    })
  ),
  commits: z.array(
    z.object({
      sha: z.string(),
      message: z.string(),
      authorName: z.string(),
      authorEmail: z.string(),
      authorDate: z.string().datetime({ offset: true }),
      committerName: z.string().nullable(),
      committerDate: z.string().datetime({ offset: true }).nullable(),
      parentShas: z.array(z.string()).nullable(),
    })
  ),
});

export const syncWorkspaceSchema = z.object({
  host: z.string(),
  cwd: z.string(),
  claudeProjectPath: z.string(),
  sessions: z.array(
    z.object({
      originalSessionId: z.string(),
      agentId: z.string().nullable(),
      parentOriginalSessionId: z.string().nullable(),
      filename: z.string(),
      fileCreatedAt: z.string().datetime({ offset: true }), // File creation date as fallback for timestamps
      entries: z.array(
        z.object({
          originalUuid: z.string().uuid().nullable(),
          lineNumber: z.number(),
          type: z.string(),
          subtype: z.string().nullable(),
          timestamp: z.string().datetime().nullable(),
          data: z.record(z.unknown()),
        })
      ),
      toolResults: z
        .array(
          z.object({
            toolUseId: z.string(),
            toolName: z.string(),
            contentType: z.string(),
            contentText: z.string().nullable(),
            contentBinary: z.string().nullable(), // base64
            sizeBytes: z.number(),
            isError: z.boolean(),
          })
        )
        .optional(),
    })
  ),
});

export const syncDataSchema = z.object({
  syncRunId: z.string().uuid(),
  gitRepos: z.array(syncGitRepoSchema).optional(),
  workspaces: z.array(syncWorkspaceSchema).optional(),
});

// RunLog schemas
export const runLogSchema = z.object({
  id: z.string().uuid(),
  collectorId: z.string().uuid(),
  syncRunId: z.string().uuid(),
  timestamp: z.string().datetime(),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  context: z.record(z.unknown()).nullable(),
});

export const runLogCreateSchema = z.object({
  syncRunId: z.string().uuid(),
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  context: z.record(z.unknown()).optional(),
});

// Sync state schema (for delta sync - single API call)
export const sessionStateItemSchema = z.object({
  originalSessionId: z.string(),
  entryCount: z.number(),
  lastLineNumber: z.number(),
});

export const syncStateResponseSchema = z.object({
  gitRepos: z.record(z.array(z.string())).openapi({
    description: "Map of git repo path to array of known commit SHAs",
  }),
  workspaces: z.record(z.array(sessionStateItemSchema)).openapi({
    description: "Map of workspace cwd to array of session states",
  }),
});
