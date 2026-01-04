import { OpenAPIHono } from "@hono/zod-openapi";
import { createOpenAPIApp } from "./openapi.js";
import { createHealthRoutes } from "./health.js";
import { createCollectorRoutes } from "./collectors.js";
import { createSyncRoutes } from "./sync.js";
import { createProjectRoutes } from "./projects.js";
import { createSessionRoutes } from "./sessions.js";
import { createConfigurationRoutes } from "./configuration.js";
import { createModelsRoutes } from "./models.js";
import { createAdminRoutes } from "./admin.js";

export function createApiRouter() {
  const api = createOpenAPIApp();

  // Mount all route groups
  api.route("/", createHealthRoutes());
  api.route("/", createCollectorRoutes());
  api.route("/", createSyncRoutes());
  api.route("/", createProjectRoutes());
  api.route("/", createSessionRoutes());
  api.route("/", createConfigurationRoutes());
  api.route("/", createModelsRoutes());
  api.route("/", createAdminRoutes());

  return api;
}
