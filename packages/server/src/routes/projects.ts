import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq, desc, like, or, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { project, gitRepo, workspace, session } from "../db/schema/index.js";
import {
  projectSchema,
  paginationSchema,
  errorSchema,
} from "./schemas.js";

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

export function createProjectRoutes() {
  const app = new OpenAPIHono();

  // List projects
  app.openapi(listProjectsRoute, async (c) => {
    const { limit, offset, search, archived } = c.req.valid("query");

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
      .orderBy(desc(project.updatedAt))
      .limit(limit)
      .offset(offset);

    if (search) {
      baseQuery = baseQuery.where(
        or(like(project.name, `%${search}%`), like(project.description, `%${search}%`))
      ) as typeof baseQuery;
    }

    if (archived !== undefined) {
      baseQuery = baseQuery.where(eq(project.archived, archived)) as typeof baseQuery;
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

        return {
          ...formatProject(p),
          gitRepoCount: Number(repoCount.count),
          workspaceCount: Number(wsCount.count),
          sessionCount,
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

    return c.json(
      {
        ...formatProject(p),
        gitRepoCount: Number(repoCount.count),
        workspaceCount: Number(wsCount.count),
        sessionCount,
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
