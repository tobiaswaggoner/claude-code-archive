import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq, desc, asc, like, or, sql, max, and, isNull } from "drizzle-orm";
import { db } from "../db/connection.js";
import { project, gitRepo, workspace, session, gitCommit } from "../db/schema/index.js";
import {
  projectSchema,
  projectUpdateSchema,
  gitCommitSchema,
  paginationSchema,
  sortOrderSchema,
  errorSchema,
} from "./schemas.js";

const projectSortBySchema = z.enum(["name", "updatedAt", "createdAt", "lastWorkedAt"]).default("lastWorkedAt").openapi({
  description: "Field to sort by",
  example: "lastWorkedAt",
});

const listProjectsRoute = createRoute({
  method: "get",
  path: "/projects",
  tags: ["projects"],
  summary: "List projects",
  description: "Get all projects with optional filtering",
  request: {
    query: z.object({
      ...paginationSchema.shape,
      search: z.string().optional().openapi({ description: "Search in name/description" }),
      archived: z.coerce.boolean().optional().openapi({ description: "Filter by archived status" }),
      sortBy: projectSortBySchema,
      sortOrder: sortOrderSchema,
    }),
  },
  responses: {
    200: {
      description: "List of projects",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(
              projectSchema.extend({
                gitRepoCount: z.number(),
                workspaceCount: z.number(),
                sessionCount: z.number(),
                lastWorkedAt: z.string().datetime().nullable(),
              })
            ),
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
          }),
        },
      },
    },
  },
});

const getProjectRoute = createRoute({
  method: "get",
  path: "/projects/{id}",
  tags: ["projects"],
  summary: "Get project",
  description: "Get a specific project with related counts",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Project details",
      content: {
        "application/json": {
          schema: projectSchema.extend({
            gitRepoCount: z.number(),
            workspaceCount: z.number(),
            sessionCount: z.number(),
            lastWorkedAt: z.string().datetime().nullable(),
          }),
        },
      },
    },
    404: {
      description: "Project not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const getProjectWorkspacesRoute = createRoute({
  method: "get",
  path: "/projects/{id}/workspaces",
  tags: ["projects"],
  summary: "Get project workspaces",
  description: "Get all workspaces for a project",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Workspaces for project",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(
              z.object({
                id: z.string().uuid(),
                projectId: z.string().uuid(),
                host: z.string(),
                cwd: z.string(),
                claudeProjectPath: z.string(),
                gitRepoId: z.string().uuid().nullable(),
                firstSeenAt: z.string().datetime(),
                lastSyncedAt: z.string().datetime(),
                sessionCount: z.number(),
              })
            ),
          }),
        },
      },
    },
  },
});

const getProjectGitReposRoute = createRoute({
  method: "get",
  path: "/projects/{id}/git-repos",
  tags: ["git"],
  summary: "Get project git repos",
  description: "Get all git repositories for a project",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Git repos for project",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(
              z.object({
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
                branchCount: z.number(),
              })
            ),
          }),
        },
      },
    },
  },
});

const updateProjectRoute = createRoute({
  method: "put",
  path: "/projects/{id}",
  tags: ["projects"],
  summary: "Update project",
  description: "Update project details (name, description, upstream URL, archived status)",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: projectUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Updated project",
      content: {
        "application/json": {
          schema: projectSchema.extend({
            gitRepoCount: z.number(),
            workspaceCount: z.number(),
            sessionCount: z.number(),
            lastWorkedAt: z.string().datetime().nullable(),
          }),
        },
      },
    },
    404: {
      description: "Project not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const getProjectCommitsRoute = createRoute({
  method: "get",
  path: "/projects/{id}/commits",
  tags: ["git"],
  summary: "Get project commits",
  description: "Get all git commits for a project with optional date filtering",
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({
      ...paginationSchema.shape,
      startDate: z.string().datetime().optional().openapi({
        description: "Filter commits after this date (ISO 8601)",
      }),
      endDate: z.string().datetime().optional().openapi({
        description: "Filter commits before this date (ISO 8601)",
      }),
      sortOrder: sortOrderSchema,
    }),
  },
  responses: {
    200: {
      description: "Git commits for project",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(gitCommitSchema),
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
          }),
        },
      },
    },
  },
});

export function createProjectRoutes() {
  const app = new OpenAPIHono();

  // List projects
  app.openapi(listProjectsRoute, async (c) => {
    const { limit, offset, search, archived, sortBy, sortOrder } = c.req.valid("query");

    const orderFn = sortOrder === "asc" ? asc : desc;

    // Compute lastWorkedAt as a SQL expression for inline sorting
    // This is the GREATEST of:
    // 1. Latest session.lastEntryAt from project's workspaces
    // 2. Latest gitCommit.authorDate from project's commits
    // 3. gitRepo.lastScannedAt when isDirty=true
    const lastWorkedAtExpr = sql<Date>`GREATEST(
      COALESCE((
        SELECT MAX(s.last_entry_at)
        FROM session s
        JOIN workspace w ON s.workspace_id = w.id
        WHERE w.project_id = ${project.id}
      ), '1970-01-01'::timestamp),
      COALESCE((
        SELECT MAX(gc.author_date)
        FROM git_commit gc
        WHERE gc.project_id = ${project.id}
      ), '1970-01-01'::timestamp),
      COALESCE((
        SELECT MAX(gr.last_scanned_at)
        FROM git_repo gr
        WHERE gr.project_id = ${project.id} AND gr.is_dirty = true
      ), '1970-01-01'::timestamp)
    )`;

    // Build sort column
    const sortColumn = sortBy === "name" ? project.name
      : sortBy === "createdAt" ? project.createdAt
      : sortBy === "lastWorkedAt" ? lastWorkedAtExpr
      : project.updatedAt;

    // Get projects with counts
    let baseQuery = db
      .select({
        id: project.id,
        name: project.name,
        upstreamUrl: project.upstreamUrl,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        archived: project.archived,
      })
      .from(project)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    if (search) {
      baseQuery = baseQuery.where(
        or(like(project.name, `%${search}%`), like(project.description, `%${search}%`))
      ) as typeof baseQuery;
    }

    if (archived !== undefined) {
      if (archived === false) {
        // Match both false and null (not archived)
        baseQuery = baseQuery.where(or(eq(project.archived, false), isNull(project.archived))) as typeof baseQuery;
      } else {
        // Match only true (archived)
        baseQuery = baseQuery.where(eq(project.archived, true)) as typeof baseQuery;
      }
    }

    const projects = await baseQuery;

    // Get counts for each project
    const items = await Promise.all(
      projects.map(async (p) => {
        const [repoCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(gitRepo)
          .where(eq(gitRepo.projectId, p.id));

        const [wsCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(workspace)
          .where(eq(workspace.projectId, p.id));

        const workspaces = await db
          .select({ id: workspace.id })
          .from(workspace)
          .where(eq(workspace.projectId, p.id));

        let sessionCount = 0;
        if (workspaces.length > 0) {
          const wsIds = workspaces.map((w) => w.id);
          for (const wsId of wsIds) {
            const [sCount] = await db
              .select({ count: sql<number>`count(*)` })
              .from(session)
              .where(eq(session.workspaceId, wsId));
            sessionCount += Number(sCount.count);
          }
        }

        // Compute lastWorkedAt as max of:
        // 1. Latest session.lastEntryAt from project's workspaces
        // 2. Latest gitCommit.authorDate from project's commits
        // 3. gitRepo.lastScannedAt when isDirty=true
        const lastWorkedAt = await computeLastWorkedAt(p.id);

        return {
          ...formatProject(p),
          gitRepoCount: Number(repoCount.count),
          workspaceCount: Number(wsCount.count),
          sessionCount,
          lastWorkedAt,
        };
      })
    );

    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(project);

    return c.json(
      {
        items,
        total: Number(totalResult.count),
        limit,
        offset,
      },
      200
    );
  });

  // Get project
  app.openapi(getProjectRoute, async (c) => {
    const { id } = c.req.valid("param");

    const [p] = await db.select().from(project).where(eq(project.id, id));

    if (!p) {
      return c.json({ error: "Project not found" }, 404);
    }

    const [repoCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gitRepo)
      .where(eq(gitRepo.projectId, id));

    const [wsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workspace)
      .where(eq(workspace.projectId, id));

    const workspaces = await db
      .select({ id: workspace.id })
      .from(workspace)
      .where(eq(workspace.projectId, id));

    let sessionCount = 0;
    for (const ws of workspaces) {
      const [sCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(session)
        .where(eq(session.workspaceId, ws.id));
      sessionCount += Number(sCount.count);
    }

    const lastWorkedAt = await computeLastWorkedAt(id);

    return c.json(
      {
        ...formatProject(p),
        gitRepoCount: Number(repoCount.count),
        workspaceCount: Number(wsCount.count),
        sessionCount,
        lastWorkedAt,
      },
      200
    );
  });

  // Get project workspaces
  app.openapi(getProjectWorkspacesRoute, async (c) => {
    const { id } = c.req.valid("param");

    const workspaces = await db
      .select()
      .from(workspace)
      .where(eq(workspace.projectId, id));

    const items = await Promise.all(
      workspaces.map(async (w) => {
        const [sCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(session)
          .where(eq(session.workspaceId, w.id));

        return {
          id: w.id,
          projectId: w.projectId,
          host: w.host,
          cwd: w.cwd,
          claudeProjectPath: w.claudeProjectPath,
          gitRepoId: w.gitRepoId,
          firstSeenAt: w.firstSeenAt.toISOString(),
          lastSyncedAt: w.lastSyncedAt.toISOString(),
          sessionCount: Number(sCount.count),
        };
      })
    );

    return c.json({ items }, 200);
  });

  // Get project git repos
  app.openapi(getProjectGitReposRoute, async (c) => {
    const { id } = c.req.valid("param");

    const repos = await db.select().from(gitRepo).where(eq(gitRepo.projectId, id));

    const items = await Promise.all(
      repos.map(async (r) => {
        const [bCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(gitRepo)
          .where(eq(gitRepo.id, r.id));

        return {
          id: r.id,
          projectId: r.projectId,
          host: r.host,
          path: r.path,
          defaultBranch: r.defaultBranch,
          currentBranch: r.currentBranch,
          headSha: r.headSha,
          isDirty: r.isDirty ?? false,
          dirtyFilesCount: r.dirtyFilesCount,
          lastScannedAt: r.lastScannedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          branchCount: Number(bCount.count),
        };
      })
    );

    return c.json({ items }, 200);
  });

  // Update project
  app.openapi(updateProjectRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    // Check if project exists
    const [existing] = await db.select().from(project).where(eq(project.id, id));
    if (!existing) {
      return c.json({ error: "Project not found" }, 404);
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof project.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.upstreamUrl !== undefined) {
      updateData.upstreamUrl = body.upstreamUrl;
    }
    if (body.archived !== undefined) {
      updateData.archived = body.archived;
    }

    // Perform update
    const [updated] = await db
      .update(project)
      .set(updateData)
      .where(eq(project.id, id))
      .returning();

    // Get counts (same as getProject)
    const [repoCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gitRepo)
      .where(eq(gitRepo.projectId, id));

    const [wsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(workspace)
      .where(eq(workspace.projectId, id));

    const workspaces = await db
      .select({ id: workspace.id })
      .from(workspace)
      .where(eq(workspace.projectId, id));

    let sessionCount = 0;
    for (const ws of workspaces) {
      const [sCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(session)
        .where(eq(session.workspaceId, ws.id));
      sessionCount += Number(sCount.count);
    }

    const lastWorkedAt = await computeLastWorkedAt(id);

    return c.json(
      {
        ...formatProject(updated),
        gitRepoCount: Number(repoCount.count),
        workspaceCount: Number(wsCount.count),
        sessionCount,
        lastWorkedAt,
      },
      200
    );
  });

  // Get project commits
  app.openapi(getProjectCommitsRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { limit, offset, startDate, endDate, sortOrder } = c.req.valid("query");

    const orderFn = sortOrder === "asc" ? asc : desc;

    // Build where conditions
    const conditions = [eq(gitCommit.projectId, id)];

    if (startDate) {
      conditions.push(sql`${gitCommit.authorDate} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${gitCommit.authorDate} <= ${endDate}`);
    }

    const commits = await db
      .select()
      .from(gitCommit)
      .where(and(...conditions))
      .orderBy(orderFn(gitCommit.authorDate))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gitCommit)
      .where(and(...conditions));

    return c.json(
      {
        items: commits.map((c) => ({
          id: c.id,
          projectId: c.projectId,
          sha: c.sha,
          message: c.message,
          authorName: c.authorName,
          authorEmail: c.authorEmail,
          authorDate: c.authorDate.toISOString(),
          committerName: c.committerName,
          committerDate: c.committerDate?.toISOString() ?? null,
          parentShas: c.parentShas,
        })),
        total: Number(totalResult.count),
        limit,
        offset,
      },
      200
    );
  });

  return app;
}

function formatProject(p: typeof project.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    upstreamUrl: p.upstreamUrl,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    archived: p.archived ?? false,
  };
}

/**
 * Compute lastWorkedAt as max of:
 * 1. Latest session.lastEntryAt from project's workspaces
 * 2. Latest gitCommit.authorDate from project's commits
 * 3. gitRepo.lastScannedAt when isDirty=true
 */
async function computeLastWorkedAt(projectId: string): Promise<string | null> {
  const candidates: Date[] = [];

  // 1. Latest session lastEntryAt from workspaces
  const [latestSession] = await db
    .select({ maxDate: max(session.lastEntryAt) })
    .from(session)
    .innerJoin(workspace, eq(session.workspaceId, workspace.id))
    .where(eq(workspace.projectId, projectId));

  if (latestSession?.maxDate) {
    candidates.push(latestSession.maxDate);
  }

  // 2. Latest commit authorDate
  const [latestCommit] = await db
    .select({ maxDate: max(gitCommit.authorDate) })
    .from(gitCommit)
    .where(eq(gitCommit.projectId, projectId));

  if (latestCommit?.maxDate) {
    candidates.push(latestCommit.maxDate);
  }

  // 3. lastScannedAt when isDirty=true
  const [latestDirtyRepo] = await db
    .select({ maxDate: max(gitRepo.lastScannedAt) })
    .from(gitRepo)
    .where(and(eq(gitRepo.projectId, projectId), eq(gitRepo.isDirty, true)));

  if (latestDirtyRepo?.maxDate) {
    candidates.push(latestDirtyRepo.maxDate);
  }

  if (candidates.length === 0) {
    return null;
  }

  // Return the most recent date
  const maxDate = new Date(Math.max(...candidates.map((d) => d.getTime())));
  return maxDate.toISOString();
}
