import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { session, entry } from "../db/schema/index.js";
import { errorSchema } from "./schemas.js";
import { calculateIsEmpty } from "../lib/entry-utils.js";

const recalculateRoute = createRoute({
  method: "post",
  path: "/admin/recalculate",
  tags: ["admin"],
  summary: "Recalculate session flags",
  description:
    "Recalculates computed session flags (isEmpty) for all sessions. Use after deploying new flag calculations or to fix inconsistent data.",
  responses: {
    200: {
      description: "Recalculation completed",
      content: {
        "application/json": {
          schema: z.object({
            totalSessions: z.number().openapi({
              description: "Total number of sessions processed",
            }),
            emptySessionsCount: z.number().openapi({
              description: "Number of sessions marked as empty",
            }),
            duration: z.number().openapi({
              description: "Duration in milliseconds",
            }),
          }),
        },
      },
    },
    500: {
      description: "Recalculation failed",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

export function createAdminRoutes() {
  const app = new OpenAPIHono();

  app.openapi(recalculateRoute, async (c) => {
    const startTime = Date.now();

    try {
      // Get all sessions
      const sessions = await db.select({ id: session.id }).from(session);

      let emptyCount = 0;

      for (const sess of sessions) {
        // Get entries for this session
        const entries = await db
          .select({
            type: entry.type,
            subtype: entry.subtype,
            data: entry.data,
          })
          .from(entry)
          .where(eq(entry.sessionId, sess.id));

        // Calculate isEmpty
        const isEmpty = calculateIsEmpty(
          entries.map((e) => ({
            type: e.type,
            subtype: e.subtype,
            data: e.data as Record<string, unknown>,
          }))
        );

        if (isEmpty) {
          emptyCount++;
        }

        // Update session
        await db
          .update(session)
          .set({ isEmpty })
          .where(eq(session.id, sess.id));
      }

      const duration = Date.now() - startTime;

      return c.json(
        {
          totalSessions: sessions.length,
          emptySessionsCount: emptyCount,
          duration,
        },
        200
      );
    } catch (error) {
      console.error("Recalculation error:", error);
      return c.json(
        {
          error: "Recalculation failed",
          message: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  });

  return app;
}
