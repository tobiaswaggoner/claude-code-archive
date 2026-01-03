import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { loadConfig } from "./lib/config.js";
import { apiKeyAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { createApiRouter } from "./routes/index.js";
import { closeConnection } from "./db/connection.js";

const config = loadConfig();

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: config.corsOrigins === "*" ? "*" : config.corsOrigins.split(","),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowHeaders: ["Content-Type", "X-API-Key"],
  })
);

// Health endpoint doesn't require auth (for k8s probes)
app.get("/health", async (c) => {
  const { healthCheck } = await import("./db/connection.js");
  const dbOk = await healthCheck();
  return c.json({
    status: dbOk ? "ok" : "error",
    timestamp: new Date().toISOString(),
  });
});

// API Key auth for all /api/* routes (BEFORE mounting routes)
app.use("/api/*", apiKeyAuth(config.apiKey));

// API routes (protected by middleware above)
const api = createApiRouter();
app.route("/api", api);

// Error handler
app.onError(errorHandler);

// Start server
const server = serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`Server running at http://localhost:${info.port}`);
    console.log(`API docs at http://localhost:${info.port}/api/docs`);
  }
);

// Graceful shutdown
const shutdown = async () => {
  console.log("\nShutting down...");
  await closeConnection();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { app };
