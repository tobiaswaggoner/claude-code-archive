import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";

export function createOpenAPIApp() {
  const app = new OpenAPIHono();

  // Register security scheme
  app.openAPIRegistry.registerComponent("securitySchemes", "apiKey", {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description: "API key for authentication",
  });

  // OpenAPI documentation endpoint
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Claude Archive API",
      version: "0.1.0",
      description: "API for archiving and querying Claude Code conversation logs",
    },
    servers: [
      {
        url: "/api",
        description: "API base path",
      },
    ],
    tags: [
      { name: "health", description: "Health check endpoints" },
      { name: "collectors", description: "Collector management and sync" },
      { name: "projects", description: "Project queries" },
      { name: "sessions", description: "Session queries" },
      { name: "entries", description: "Entry queries" },
      { name: "git", description: "Git repository data" },
      { name: "configuration", description: "Configuration management" },
    ],
    security: [{ apiKey: [] }],
  });

  // Scalar API reference UI
  app.get(
    "/docs",
    apiReference({
      spec: { url: "/api/openapi.json" },
      theme: "kepler",
      layout: "modern",
      defaultHttpClient: { targetKey: "js", clientKey: "fetch" },
    })
  );

  return app;
}
