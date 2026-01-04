import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq, desc, asc, and, isNull, sql } from "drizzle-orm";
import { db } from "../db/connection.js";
import { session, entry, workspace, project } from "../db/schema/index.js";
import {
  sessionSchema,
  entrySchema,
  paginationSchema,
  sortOrderSchema,
  errorSchema,
  generateSummaryRequestSchema,
  generateSummaryResponseSchema,
} from "./schemas.js";
import { createSummaryGenerator, isSummaryAvailable } from "../services/summary/index.js";

const sessionSortBySchema = z.enum(["lastEntryAt", "entryCount", "totalTokens"]).default("lastEntryAt").openapi({
  description: "Field to sort by",
  example: "lastEntryAt",
});

const listSessionsRoute = createRoute({
  method: "get",
  path: "/sessions",
  tags: ["sessions"],
  summary: "List sessions",
  description: "Get all sessions with optional filtering",
  request: {
    query: z.object({
      ...paginationSchema.shape,
      workspaceId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
      mainOnly: z.coerce.boolean().default(false).openapi({
        description: "Only return main sessions (exclude agent sessions)",
      }),
      sortBy: sessionSortBySchema,
      sortOrder: sortOrderSchema,
    }),
  },
  responses: {
    200: {
      description: "List of sessions",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(
              sessionSchema.extend({
                workspaceHost: z.string(),
                workspaceCwd: z.string(),
                projectName: z.string(),
                agentCount: z.number(),
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

const getSessionRoute = createRoute({
  method: "get",
  path: "/sessions/{id}",
  tags: ["sessions"],
  summary: "Get session",
  description: "Get a specific session with its entries",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Session details with entries",
      content: {
        "application/json": {
          schema: sessionSchema.extend({
            workspaceHost: z.string(),
            workspaceCwd: z.string(),
            projectName: z.string(),
            agents: z.array(sessionSchema),
          }),
        },
      },
    },
    404: {
      description: "Session not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const getSessionAdjacentRoute = createRoute({
  method: "get",
  path: "/sessions/{id}/adjacent",
  tags: ["sessions"],
  summary: "Get adjacent sessions",
  description: "Get previous and next session IDs within the same project",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Adjacent session IDs",
      content: {
        "application/json": {
          schema: z.object({
            prev: z.string().uuid().nullable(),
            next: z.string().uuid().nullable(),
          }),
        },
      },
    },
    404: {
      description: "Session not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const getSessionEntriesRoute = createRoute({
  method: "get",
  path: "/sessions/{id}/entries",
  tags: ["entries"],
  summary: "Get session entries",
  description: "Get entries for a session with optional filtering",
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({
      ...paginationSchema.shape,
      type: z.string().optional().openapi({ description: "Filter by entry type" }),
      order: z.enum(["asc", "desc"]).default("asc").openapi({
        description: "Sort order by line number (asc for oldest first, desc for newest first)",
      }),
    }),
  },
  responses: {
    200: {
      description: "Session entries",
      content: {
        "application/json": {
          schema: z.object({
            items: z.array(entrySchema),
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
          }),
        },
      },
    },
  },
});

const getSessionFirstEntryRoute = createRoute({
  method: "get",
  path: "/sessions/{id}/first-entry",
  tags: ["entries"],
  summary: "Get first user message of session",
  description: "Get the first user/human message (by line number) of a session",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "First user message of the session",
      content: { "application/json": { schema: entrySchema } },
    },
    404: {
      description: "No user entries found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const getEntryRoute = createRoute({
  method: "get",
  path: "/entries/{id}",
  tags: ["entries"],
  summary: "Get entry",
  description: "Get a specific entry by ID",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Entry details",
      content: { "application/json": { schema: entrySchema } },
    },
    404: {
      description: "Entry not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const generateSummaryRoute = createRoute({
  method: "post",
  path: "/sessions/{id}/summary",
  tags: ["sessions"],
  summary: "Generate AI summary",
  description: "Generate an AI-powered summary for a session using OpenRouter",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: generateSummaryRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Summary generated successfully",
      content: {
        "application/json": {
          schema: generateSummaryResponseSchema,
        },
      },
    },
    404: {
      description: "Session not found",
      content: { "application/json": { schema: errorSchema } },
    },
    500: {
      description: "Summary generation failed",
      content: { "application/json": { schema: errorSchema } },
    },
    503: {
      description: "OpenRouter not configured",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

export function createSessionRoutes() {
  const app = new OpenAPIHono();

  // List sessions
  app.openapi(listSessionsRoute, async (c) => {
    const { limit, offset, workspaceId, projectId, mainOnly, sortBy, sortOrder } = c.req.valid("query");

    // Build sort expression
    const orderFn = sortOrder === "asc" ? asc : desc;
    const sortColumn = sortBy === "entryCount" ? session.entryCount
      : sortBy === "totalTokens" ? sql`${session.totalInputTokens} + ${session.totalOutputTokens}`
      : session.lastEntryAt;

    // Build where conditions array
    const conditions = [];
    if (workspaceId) {
      conditions.push(eq(session.workspaceId, workspaceId));
    }
    if (projectId) {
      conditions.push(eq(workspace.projectId, projectId));
    }
    if (mainOnly) {
      conditions.push(isNull(session.parentSessionId));
    }

    let query = db
      .select({
        session: session,
        workspace: workspace,
        project: project,
      })
      .from(session)
      .innerJoin(workspace, eq(session.workspaceId, workspace.id))
      .innerJoin(project, eq(workspace.projectId, project.id))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const results = await query;

    const items = await Promise.all(
      results.map(async (r) => {
        const [agentCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(session)
          .where(eq(session.parentSessionId, r.session.id));

        return {
          ...formatSession(r.session),
          workspaceHost: r.workspace.host,
          workspaceCwd: r.workspace.cwd,
          projectName: r.project.name,
          agentCount: Number(agentCount.count),
        };
      })
    );

    // Build count query with same filters
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(session)
      .innerJoin(workspace, eq(session.workspaceId, workspace.id));

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
    }

    const [totalResult] = await countQuery;

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

  // Get session
  app.openapi(getSessionRoute, async (c) => {
    const { id } = c.req.valid("param");

    const [result] = await db
      .select({
        session: session,
        workspace: workspace,
        project: project,
      })
      .from(session)
      .innerJoin(workspace, eq(session.workspaceId, workspace.id))
      .innerJoin(project, eq(workspace.projectId, project.id))
      .where(eq(session.id, id));

    if (!result) {
      return c.json({ error: "Session not found" }, 404);
    }

    // Get agent sessions
    const agents = await db
      .select()
      .from(session)
      .where(eq(session.parentSessionId, id))
      .orderBy(session.firstEntryAt);

    return c.json(
      {
        ...formatSession(result.session),
        workspaceHost: result.workspace.host,
        workspaceCwd: result.workspace.cwd,
        projectName: result.project.name,
        agents: agents.map(formatSession),
      },
      200
    );
  });

  // Get adjacent sessions (prev/next in same project)
  app.openapi(getSessionAdjacentRoute, async (c) => {
    const { id } = c.req.valid("param");

    // First get the current session with its project
    const [current] = await db
      .select({
        session: session,
        workspace: workspace,
      })
      .from(session)
      .innerJoin(workspace, eq(session.workspaceId, workspace.id))
      .where(eq(session.id, id));

    if (!current) {
      return c.json({ error: "Session not found" }, 404);
    }

    const projectId = current.workspace.projectId;
    const currentFirstEntryAt = current.session.firstEntryAt;

    // Find previous session (earlier firstEntryAt, same project, main sessions only)
    const [prevSession] = currentFirstEntryAt
      ? await db
          .select({ id: session.id })
          .from(session)
          .innerJoin(workspace, eq(session.workspaceId, workspace.id))
          .where(
            and(
              eq(workspace.projectId, projectId),
              isNull(session.parentSessionId),
              sql`${session.firstEntryAt} < ${currentFirstEntryAt.toISOString()}`
            )
          )
          .orderBy(desc(session.firstEntryAt))
          .limit(1)
      : [];

    // Find next session (later firstEntryAt, same project, main sessions only)
    const [nextSession] = currentFirstEntryAt
      ? await db
          .select({ id: session.id })
          .from(session)
          .innerJoin(workspace, eq(session.workspaceId, workspace.id))
          .where(
            and(
              eq(workspace.projectId, projectId),
              isNull(session.parentSessionId),
              sql`${session.firstEntryAt} > ${currentFirstEntryAt.toISOString()}`
            )
          )
          .orderBy(asc(session.firstEntryAt))
          .limit(1)
      : [];

    return c.json(
      {
        prev: prevSession?.id ?? null,
        next: nextSession?.id ?? null,
      },
      200
    );
  });

  // Get session entries
  app.openapi(getSessionEntriesRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { limit, offset, type, order } = c.req.valid("query");

    const whereClause = type
      ? and(eq(entry.sessionId, id), eq(entry.type, type))
      : eq(entry.sessionId, id);

    const orderFn = order === "desc" ? desc : asc;

    const entries = await db
      .select()
      .from(entry)
      .where(whereClause)
      .orderBy(orderFn(entry.lineNumber))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(entry)
      .where(eq(entry.sessionId, id));

    return c.json(
      {
        items: entries.map(formatEntry),
        total: Number(totalResult.count),
        limit,
        offset,
      },
      200
    );
  });

  // Get first user entry of session
  app.openapi(getSessionFirstEntryRoute, async (c) => {
    const { id } = c.req.valid("param");

    // Find first user/human message (the actual first user input)
    const [firstEntry] = await db
      .select()
      .from(entry)
      .where(
        and(
          eq(entry.sessionId, id),
          sql`${entry.type} IN ('user', 'human')`
        )
      )
      .orderBy(asc(entry.lineNumber))
      .limit(1);

    if (!firstEntry) {
      return c.json({ error: "No user entries found" }, 404);
    }

    return c.json(formatEntry(firstEntry), 200);
  });

  // Get entry
  app.openapi(getEntryRoute, async (c) => {
    const { id } = c.req.valid("param");

    const [e] = await db.select().from(entry).where(eq(entry.id, id));

    if (!e) {
      return c.json({ error: "Entry not found" }, 404);
    }

    return c.json(formatEntry(e), 200);
  });

  // Generate AI summary
  app.openapi(generateSummaryRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    // Check if OpenRouter is configured
    if (!isSummaryAvailable()) {
      return c.json(
        {
          error: "OpenRouter not configured",
          message: "Set OPENROUTER_API_URL and OPENROUTER_API_KEY environment variables",
        },
        503
      );
    }

    try {
      const generator = createSummaryGenerator(db);
      const result = await generator.generate({
        sessionId: id,
        userInstructions: body.userInstructions,
      });

      return c.json(result, 200);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Session not found") {
          return c.json({ error: "Session not found" }, 404);
        }
      }
      console.error("Summary generation error:", error);
      return c.json(
        {
          error: "Summary generation failed",
          message: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });

  return app;
}

function formatSession(s: typeof session.$inferSelect) {
  return {
    id: s.id,
    workspaceId: s.workspaceId,
    originalSessionId: s.originalSessionId,
    parentSessionId: s.parentSessionId,
    agentId: s.agentId,
    filename: s.filename,
    firstEntryAt: s.firstEntryAt?.toISOString() ?? null,
    lastEntryAt: s.lastEntryAt?.toISOString() ?? null,
    entryCount: s.entryCount ?? 0,
    summary: s.summary,
    modelsUsed: s.modelsUsed,
    totalInputTokens: s.totalInputTokens ?? 0,
    totalOutputTokens: s.totalOutputTokens ?? 0,
    syncedAt: s.syncedAt.toISOString(),
  };
}

function formatEntry(e: typeof entry.$inferSelect) {
  return {
    id: e.id,
    sessionId: e.sessionId,
    originalUuid: e.originalUuid,
    lineNumber: e.lineNumber,
    type: e.type,
    subtype: e.subtype,
    timestamp: e.timestamp?.toISOString() ?? null,
    data: e.data as Record<string, unknown>,
  };
}
