import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { healthCheck } from "../db/connection.js";

const healthResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  timestamp: z.string(),
  database: z.enum(["connected", "disconnected"]),
  version: z.string(),
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["health"],
  summary: "Health check",
  description: "Check API and database health",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
    503: {
      description: "Service is unhealthy",
      content: {
        "application/json": {
          schema: healthResponseSchema,
        },
      },
    },
  },
});

export function createHealthRoutes() {
  const app = new OpenAPIHono();

  app.openapi(healthRoute, async (c) => {
    const dbOk = await healthCheck();
    const response = {
      status: dbOk ? ("ok" as const) : ("error" as const),
      timestamp: new Date().toISOString(),
      database: dbOk ? ("connected" as const) : ("disconnected" as const),
      version: "0.1.0",
    };

    return c.json(response, dbOk ? 200 : 503);
  });

  return app;
}
