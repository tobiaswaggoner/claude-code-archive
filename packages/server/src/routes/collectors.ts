import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { collector, runLog } from "../db/schema/index.js";
import {
  collectorSchema,
  collectorRegisterSchema,
  collectorHeartbeatSchema,
  runLogCreateSchema,
  runLogSchema,
  errorSchema,
  paginatedResponseSchema,
} from "./schemas.js";

// Routes
const registerRoute = createRoute({
  method: "post",
  path: "/collectors/register",
  tags: ["collectors"],
  summary: "Register a collector",
  description: "Register a new collector or update existing registration",
  request: {
    body: {
      content: { "application/json": { schema: collectorRegisterSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Collector registered successfully",
      content: { "application/json": { schema: collectorSchema } },
    },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const heartbeatRoute = createRoute({
  method: "post",
  path: "/collectors/{id}/heartbeat",
  tags: ["collectors"],
  summary: "Collector heartbeat",
  description: "Update collector last seen time and optionally sync status",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: collectorHeartbeatSchema } },
      required: false,
    },
  },
  responses: {
    200: {
      description: "Heartbeat recorded",
      content: { "application/json": { schema: z.object({ ok: z.boolean() }) } },
    },
    404: {
      description: "Collector not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const listCollectorsRoute = createRoute({
  method: "get",
  path: "/collectors",
  tags: ["collectors"],
  summary: "List collectors",
  description: "Get all registered collectors",
  request: {
    query: z.object({
      activeOnly: z.coerce.boolean().default(false),
    }),
  },
  responses: {
    200: {
      description: "List of collectors",
      content: {
        "application/json": { schema: z.object({ items: z.array(collectorSchema) }) },
      },
    },
  },
});

const getCollectorRoute = createRoute({
  method: "get",
  path: "/collectors/{id}",
  tags: ["collectors"],
  summary: "Get collector",
  description: "Get a specific collector by ID",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Collector details",
      content: { "application/json": { schema: collectorSchema } },
    },
    404: {
      description: "Collector not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const logRoute = createRoute({
  method: "post",
  path: "/collectors/{id}/logs",
  tags: ["collectors"],
  summary: "Submit run logs",
  description: "Submit one or more log entries for a sync run",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": {
          schema: z.object({ logs: z.array(runLogCreateSchema) }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Logs recorded",
      content: {
        "application/json": { schema: z.object({ count: z.number() }) },
      },
    },
    404: {
      description: "Collector not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

const getLogsRoute = createRoute({
  method: "get",
  path: "/collectors/{id}/logs",
  tags: ["collectors"],
  summary: "Get run logs",
  description: "Get logs for a collector, optionally filtered by sync run",
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: z.object({
      syncRunId: z.string().uuid().optional(),
      level: z.enum(["debug", "info", "warn", "error"]).optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
    }),
  },
  responses: {
    200: {
      description: "Log entries",
      content: {
        "application/json": { schema: z.object({ items: z.array(runLogSchema) }) },
      },
    },
  },
});

export function createCollectorRoutes() {
  const app = new OpenAPIHono();

  // Register collector
  app.openapi(registerRoute, async (c) => {
    const data = c.req.valid("json");
    const now = new Date();

    const [result] = await db
      .insert(collector)
      .values({
        id: data.id,
        name: data.name,
        hostname: data.hostname,
        osInfo: data.osInfo ?? null,
        version: data.version ?? null,
        config: data.config ?? null,
        registeredAt: now,
        lastSeenAt: now,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: collector.id,
        set: {
          name: data.name,
          osInfo: data.osInfo ?? null,
          version: data.version ?? null,
          config: data.config ?? null,
          lastSeenAt: now,
          isActive: true,
        },
      })
      .returning();

    return c.json(formatCollector(result), 200);
  });

  // Heartbeat
  app.openapi(heartbeatRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");

    const updateData: Partial<typeof collector.$inferInsert> = {
      lastSeenAt: new Date(),
    };
    if (body?.syncRunId) updateData.lastSyncRunId = body.syncRunId;
    if (body?.syncStatus) updateData.lastSyncStatus = body.syncStatus;

    const [result] = await db
      .update(collector)
      .set(updateData)
      .where(eq(collector.id, id))
      .returning();

    if (!result) {
      return c.json({ error: "Collector not found" }, 404);
    }

    return c.json({ ok: true }, 200);
  });

  // List collectors
  app.openapi(listCollectorsRoute, async (c) => {
    const { activeOnly } = c.req.valid("query");

    let query = db.select().from(collector);
    if (activeOnly) {
      query = query.where(eq(collector.isActive, true)) as typeof query;
    }

    const results = await query;
    return c.json({ items: results.map(formatCollector) }, 200);
  });

  // Get collector
  app.openapi(getCollectorRoute, async (c) => {
    const { id } = c.req.valid("param");
    const [result] = await db.select().from(collector).where(eq(collector.id, id));

    if (!result) {
      return c.json({ error: "Collector not found" }, 404);
    }

    return c.json(formatCollector(result), 200);
  });

  // Submit logs
  app.openapi(logRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { logs } = c.req.valid("json");

    // Verify collector exists
    const [coll] = await db.select().from(collector).where(eq(collector.id, id));
    if (!coll) {
      return c.json({ error: "Collector not found" }, 404);
    }

    const now = new Date();
    const entries = logs.map((log) => ({
      collectorId: id,
      syncRunId: log.syncRunId,
      timestamp: now,
      level: log.level,
      message: log.message,
      context: log.context ?? null,
    }));

    await db.insert(runLog).values(entries);

    return c.json({ count: entries.length }, 200);
  });

  // Get logs
  app.openapi(getLogsRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { syncRunId, level, limit } = c.req.valid("query");

    let query = db
      .select()
      .from(runLog)
      .where(eq(runLog.collectorId, id))
      .orderBy(runLog.timestamp)
      .limit(limit);

    // Note: Additional filters would need dynamic query building
    // For now, filter in memory for simplicity
    let results = await query;

    if (syncRunId) {
      results = results.filter((r) => r.syncRunId === syncRunId);
    }
    if (level) {
      results = results.filter((r) => r.level === level);
    }

    return c.json({ items: results.map(formatRunLog) }, 200);
  });

  return app;
}

type SyncStatus = "success" | "error" | "partial";
type LogLevel = "debug" | "info" | "warn" | "error";

function formatCollector(c: typeof collector.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    hostname: c.hostname,
    osInfo: c.osInfo,
    version: c.version,
    config: c.config as Record<string, unknown> | null,
    registeredAt: c.registeredAt.toISOString(),
    lastSeenAt: c.lastSeenAt.toISOString(),
    lastSyncRunId: c.lastSyncRunId,
    lastSyncStatus: c.lastSyncStatus as SyncStatus | null,
    isActive: c.isActive ?? true,
  };
}

function formatRunLog(r: typeof runLog.$inferSelect) {
  return {
    id: r.id,
    collectorId: r.collectorId,
    syncRunId: r.syncRunId,
    timestamp: r.timestamp.toISOString(),
    level: r.level as LogLevel,
    message: r.message,
    context: r.context as Record<string, unknown> | null,
  };
}
