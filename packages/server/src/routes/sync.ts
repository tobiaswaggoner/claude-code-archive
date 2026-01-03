import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.js";
import {
  project,
  gitRepo,
  gitBranch,
  gitCommit,
  workspace,
  session,
  entry,
  toolResult,
} from "../db/schema/index.js";
import { syncDataSchema, errorSchema } from "./schemas.js";
import { normalizeUpstreamUrl } from "../lib/utils.js";

const syncRoute = createRoute({
  method: "post",
  path: "/collectors/{id}/sync",
  tags: ["collectors"],
  summary: "Sync data from collector",
  description: "Upload git repos, workspaces, sessions, and entries",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: syncDataSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Sync completed",
      content: {
        "application/json": {
          schema: z.object({
            projectsCreated: z.number(),
            projectsUpdated: z.number(),
            gitReposCreated: z.number(),
            gitReposUpdated: z.number(),
            workspacesCreated: z.number(),
            workspacesUpdated: z.number(),
            sessionsCreated: z.number(),
            sessionsUpdated: z.number(),
            entriesCreated: z.number(),
            commitsCreated: z.number(),
            branchesCreated: z.number(),
            branchesUpdated: z.number(),
          }),
        },
      },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

export function createSyncRoutes() {
  const app = new OpenAPIHono();

  app.openapi(syncRoute, async (c) => {
    const { id: collectorId } = c.req.valid("param");
    const data = c.req.valid("json");

    const stats = {
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
    };

    const now = new Date();

    // Process git repos
    if (data.gitRepos) {
      for (const repo of data.gitRepos) {
        // Find or create project
        let projectId: string;

        if (repo.upstreamUrl) {
          const normalized = normalizeUpstreamUrl(repo.upstreamUrl);
          const [existing] = await db
            .select()
            .from(project)
            .where(eq(project.upstreamUrl, normalized));

          if (existing) {
            projectId = existing.id;
            await db
              .update(project)
              .set({ updatedAt: now })
              .where(eq(project.id, projectId));
            stats.projectsUpdated++;
          } else {
            const [newProject] = await db
              .insert(project)
              .values({
                name: repo.path.split("/").pop() || "unknown",
                upstreamUrl: normalized,
                createdAt: now,
                updatedAt: now,
              })
              .returning();
            projectId = newProject.id;
            stats.projectsCreated++;
          }
        } else {
          // Local-only repo: unique per host+path
          const [existing] = await db
            .select()
            .from(gitRepo)
            .where(and(eq(gitRepo.host, repo.host), eq(gitRepo.path, repo.path)));

          if (existing) {
            projectId = existing.projectId;
            stats.projectsUpdated++;
          } else {
            const [newProject] = await db
              .insert(project)
              .values({
                name: repo.path.split("/").pop() || "unknown",
                createdAt: now,
                updatedAt: now,
              })
              .returning();
            projectId = newProject.id;
            stats.projectsCreated++;
          }
        }

        // Upsert git repo
        const [existingRepo] = await db
          .select()
          .from(gitRepo)
          .where(and(eq(gitRepo.host, repo.host), eq(gitRepo.path, repo.path)));

        let repoId: string;

        if (existingRepo) {
          await db
            .update(gitRepo)
            .set({
              projectId,
              defaultBranch: repo.defaultBranch,
              currentBranch: repo.currentBranch,
              headSha: repo.headSha,
              isDirty: repo.isDirty,
              dirtyFilesCount: repo.dirtyFilesCount,
              dirtySnapshot: repo.dirtySnapshot,
              lastFileChangeAt: repo.lastFileChangeAt ? new Date(repo.lastFileChangeAt) : null,
              lastScannedAt: now,
            })
            .where(eq(gitRepo.id, existingRepo.id));
          repoId = existingRepo.id;
          stats.gitReposUpdated++;
        } else {
          const [newRepo] = await db
            .insert(gitRepo)
            .values({
              projectId,
              host: repo.host,
              path: repo.path,
              defaultBranch: repo.defaultBranch,
              currentBranch: repo.currentBranch,
              headSha: repo.headSha,
              isDirty: repo.isDirty,
              dirtyFilesCount: repo.dirtyFilesCount,
              dirtySnapshot: repo.dirtySnapshot,
              lastFileChangeAt: repo.lastFileChangeAt ? new Date(repo.lastFileChangeAt) : null,
              lastScannedAt: now,
              createdAt: now,
            })
            .returning();
          repoId = newRepo.id;
          stats.gitReposCreated++;
        }

        // Process branches
        for (const branch of repo.branches) {
          const [existingBranch] = await db
            .select()
            .from(gitBranch)
            .where(and(eq(gitBranch.gitRepoId, repoId), eq(gitBranch.name, branch.name)));

          if (existingBranch) {
            // Check for force push
            const isForceP =
              existingBranch.headSha !== branch.headSha &&
              branch.headSha !== existingBranch.headSha;
            // Note: Real force-push detection requires parent traversal

            await db
              .update(gitBranch)
              .set({
                headSha: branch.headSha,
                upstreamName: branch.upstreamName,
                upstreamSha: branch.upstreamSha,
                aheadCount: branch.aheadCount,
                behindCount: branch.behindCount,
                lastCommitAt: branch.lastCommitAt ? new Date(branch.lastCommitAt) : null,
                lastSeenAt: now,
              })
              .where(eq(gitBranch.id, existingBranch.id));
            stats.branchesUpdated++;
          } else {
            await db.insert(gitBranch).values({
              gitRepoId: repoId,
              name: branch.name,
              headSha: branch.headSha,
              upstreamName: branch.upstreamName,
              upstreamSha: branch.upstreamSha,
              aheadCount: branch.aheadCount,
              behindCount: branch.behindCount,
              lastCommitAt: branch.lastCommitAt ? new Date(branch.lastCommitAt) : null,
              discoveredAt: now,
              lastSeenAt: now,
            });
            stats.branchesCreated++;
          }
        }

        // Process commits
        for (const commit of repo.commits) {
          try {
            await db.insert(gitCommit).values({
              projectId,
              sha: commit.sha,
              message: commit.message,
              authorName: commit.authorName,
              authorEmail: commit.authorEmail,
              authorDate: new Date(commit.authorDate),
              committerName: commit.committerName,
              committerDate: commit.committerDate ? new Date(commit.committerDate) : null,
              parentShas: commit.parentShas,
            });
            stats.commitsCreated++;
          } catch (e: unknown) {
            // Ignore duplicate key errors (commit already exists)
            if (!(e instanceof Error && e.message.includes("duplicate key"))) {
              throw e;
            }
          }
        }
      }
    }

    // Process workspaces
    if (data.workspaces) {
      for (const ws of data.workspaces) {
        // Find matching git repo for this workspace by checking if cwd is inside repo path
        const reposOnHost = await db
          .select()
          .from(gitRepo)
          .where(eq(gitRepo.host, ws.host));

        // Find the git repo whose path contains this workspace's cwd
        // Sort by path length descending to match the most specific (deepest) repo first
        const matchingRepo = reposOnHost
          .filter((repo) => ws.cwd === repo.path || ws.cwd.startsWith(repo.path + "/"))
          .sort((a, b) => b.path.length - a.path.length)[0];

        let projectId: string;
        let gitRepoId: string | null = null;

        if (matchingRepo) {
          projectId = matchingRepo.projectId;
          gitRepoId = matchingRepo.id;
        } else {
          // No git repo found - check if a project with matching name already exists
          const workspaceName = ws.cwd.split("/").pop() || "unknown";
          const [existingProject] = await db
            .select()
            .from(project)
            .where(eq(project.name, workspaceName));

          if (existingProject && !existingProject.upstreamUrl) {
            // Reuse existing non-git project
            projectId = existingProject.id;
          } else {
            // Create project for workspace without git
            const [newProject] = await db
              .insert(project)
              .values({
                name: workspaceName,
                createdAt: now,
                updatedAt: now,
              })
              .returning();
            projectId = newProject.id;
            stats.projectsCreated++;
          }
        }

        // Upsert workspace
        const [existingWs] = await db
          .select()
          .from(workspace)
          .where(and(eq(workspace.host, ws.host), eq(workspace.cwd, ws.cwd)));

        let workspaceId: string;

        if (existingWs) {
          await db
            .update(workspace)
            .set({
              projectId,
              gitRepoId,
              lastSyncedAt: now,
            })
            .where(eq(workspace.id, existingWs.id));
          workspaceId = existingWs.id;
          stats.workspacesUpdated++;
        } else {
          const [newWs] = await db
            .insert(workspace)
            .values({
              projectId,
              host: ws.host,
              cwd: ws.cwd,
              claudeProjectPath: ws.claudeProjectPath,
              gitRepoId,
              firstSeenAt: now,
              lastSyncedAt: now,
            })
            .returning();
          workspaceId = newWs.id;
          stats.workspacesCreated++;
        }

        // Build session map for parent linking
        const sessionMap = new Map<string, string>();

        // First pass: create sessions
        for (const sess of ws.sessions) {
          const [existingSess] = await db
            .select()
            .from(session)
            .where(
              and(
                eq(session.workspaceId, workspaceId),
                eq(session.originalSessionId, sess.originalSessionId)
              )
            );

          let sessionId: string;

          // Parse fileCreatedAt for use as initial/fallback timestamp
          const fileCreatedAt = new Date(sess.fileCreatedAt);

          if (existingSess) {
            sessionId = existingSess.id;
            stats.sessionsUpdated++;
          } else {
            const [newSess] = await db
              .insert(session)
              .values({
                workspaceId,
                originalSessionId: sess.originalSessionId,
                agentId: sess.agentId,
                filename: sess.filename,
                // Use file creation date as initial timestamps (will be updated by aggregates)
                firstEntryAt: fileCreatedAt,
                lastEntryAt: fileCreatedAt,
                syncedAt: now,
              })
              .returning();
            sessionId = newSess.id;
            stats.sessionsCreated++;
          }

          sessionMap.set(sess.originalSessionId, sessionId);

          // Insert entries
          for (const ent of sess.entries) {
            try {
              const [newEntry] = await db
                .insert(entry)
                .values({
                  sessionId,
                  originalUuid: ent.originalUuid,
                  lineNumber: ent.lineNumber,
                  type: ent.type,
                  subtype: ent.subtype,
                  timestamp: ent.timestamp ? new Date(ent.timestamp) : null,
                  data: ent.data,
                })
                .returning();
              stats.entriesCreated++;

              // Insert tool results if present
              if (sess.toolResults) {
                for (const tr of sess.toolResults) {
                  await db.insert(toolResult).values({
                    entryId: newEntry.id,
                    toolUseId: tr.toolUseId,
                    toolName: tr.toolName,
                    contentType: tr.contentType,
                    contentText: tr.contentText,
                    contentBinary: tr.contentBinary
                      ? Buffer.from(tr.contentBinary, "base64")
                      : null,
                    sizeBytes: tr.sizeBytes,
                    isError: tr.isError,
                    createdAt: now,
                  });
                }
              }
            } catch (e: unknown) {
              // Ignore duplicate entries
              if (!(e instanceof Error && e.message.includes("duplicate key"))) {
                throw e;
              }
            }
          }
        }

        // Second pass: link parent sessions
        for (const sess of ws.sessions) {
          if (sess.parentOriginalSessionId) {
            const sessionId = sessionMap.get(sess.originalSessionId);
            const parentId = sessionMap.get(sess.parentOriginalSessionId);

            if (sessionId && parentId) {
              await db
                .update(session)
                .set({ parentSessionId: parentId })
                .where(eq(session.id, sessionId));
            }
          }
        }

        // Update session aggregates
        for (const sess of ws.sessions) {
          const sessionId = sessionMap.get(sess.originalSessionId);
          if (sessionId) {
            await updateSessionAggregates(sessionId, new Date(sess.fileCreatedAt));
          }
        }
      }
    }

    return c.json(stats, 200);
  });

  return app;
}

async function updateSessionAggregates(sessionId: string, fileCreatedAt: Date) {
  const entries = await db.select().from(entry).where(eq(entry.sessionId, sessionId));

  if (entries.length === 0) return;

  const timestamps = entries
    .filter((e) => e.timestamp)
    .map((e) => e.timestamp!.getTime());

  const modelsUsed = new Set<string>();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let summary: string | null = null;

  for (const e of entries) {
    const data = e.data as Record<string, unknown>;

    // Assistant entries have model and usage in message object
    if (e.type === "assistant" && data.message && typeof data.message === "object") {
      const message = data.message as Record<string, unknown>;

      if (message.model && typeof message.model === "string") {
        modelsUsed.add(message.model);
      }

      if (message.usage && typeof message.usage === "object") {
        const usage = message.usage as Record<string, number>;
        totalInputTokens += usage.input_tokens || 0;
        totalOutputTokens += usage.output_tokens || 0;
      }
    }

    // Summary entries have summary at top level
    if (e.type === "summary" && data.summary && typeof data.summary === "string") {
      summary = data.summary;
    }
  }

  // Use entry timestamps if available, otherwise fall back to file creation date
  const firstEntryAt = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : fileCreatedAt;
  const lastEntryAt = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : fileCreatedAt;

  await db
    .update(session)
    .set({
      entryCount: entries.length,
      firstEntryAt,
      lastEntryAt,
      modelsUsed: modelsUsed.size > 0 ? Array.from(modelsUsed) : null,
      totalInputTokens,
      totalOutputTokens,
      summary,
      syncedAt: new Date(),
    })
    .where(eq(session.id, sessionId));
}
