import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { loadConfig } from "./lib/config.js";
import { auth } from "./lib/auth.js";
import { dualAuth, type AuthVariables } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { createApiRouter } from "./routes/index.js";
import { closeConnection } from "./db/connection.js";

const config = loadConfig();

const app = new Hono<{ Variables: AuthVariables }>();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: config.corsOrigins === "*" ? "*" : config.corsOrigins.split(","),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-API-Key", "Authorization"],
    credentials: true, // Required for session cookies
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

// Better Auth handler - mounted BEFORE auth middleware
// Handles /api/auth/* endpoints (sign-up, sign-in, sign-out, etc.)
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

// Dual auth middleware for all /api/* routes
// Supports both API key (for collectors) and session cookies (for web UI)
app.use("/api/*", dualAuth());

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
    console.log(`Auth endpoints at http://localhost:${info.port}/api/auth/*`);
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
