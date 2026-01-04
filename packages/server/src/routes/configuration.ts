import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connection.js";
import { configuration } from "../db/schema/index.js";
import {
  configurationSchema,
  configurationCreateSchema,
  configurationUpdateSchema,
  errorSchema,
} from "./schemas.js";

// List configurations
const listConfigurationsRoute = createRoute({
  method: "get",
  path: "/configuration",
  tags: ["configuration"],
  summary: "List configurations",
  description: "Get all configurations, optionally filtered by category",
  request: {
    query: z.object({
      category: z.string().optional().openapi({
        description: "Filter by category",
        example: "summary",
      }),
    }),
  },
  responses: {
    200: {
      description: "List of configurations",
      content: {
        "application/json": {
          schema: z.array(configurationSchema),
        },
      },
    },
  },
});

// Get single configuration
const getConfigurationRoute = createRoute({
  method: "get",
  path: "/configuration/{category}/{key}",
  tags: ["configuration"],
  summary: "Get configuration",
  description: "Get a specific configuration by category and key",
  request: {
    params: z.object({
      category: z.string(),
      key: z.string(),
    }),
  },
  responses: {
    200: {
      description: "Configuration entry",
      content: {
        "application/json": {
          schema: configurationSchema,
        },
      },
    },
    404: {
      description: "Configuration not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

// Create configuration
const createConfigurationRoute = createRoute({
  method: "post",
  path: "/configuration",
  tags: ["configuration"],
  summary: "Create configuration",
  description: "Create a new configuration entry",
  request: {
    body: {
      content: {
        "application/json": {
          schema: configurationCreateSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Configuration created",
      content: {
        "application/json": {
          schema: configurationSchema,
        },
      },
    },
    409: {
      description: "Configuration already exists",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

// Update configuration
const updateConfigurationRoute = createRoute({
  method: "put",
  path: "/configuration/{category}/{key}",
  tags: ["configuration"],
  summary: "Update configuration",
  description: "Update an existing configuration entry",
  request: {
    params: z.object({
      category: z.string(),
      key: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: configurationUpdateSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Configuration updated",
      content: {
        "application/json": {
          schema: configurationSchema,
        },
      },
    },
    404: {
      description: "Configuration not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

// Delete configuration
const deleteConfigurationRoute = createRoute({
  method: "delete",
  path: "/configuration/{category}/{key}",
  tags: ["configuration"],
  summary: "Delete configuration",
  description: "Delete a configuration entry",
  request: {
    params: z.object({
      category: z.string(),
      key: z.string(),
    }),
  },
  responses: {
    204: {
      description: "Configuration deleted",
    },
    404: {
      description: "Configuration not found",
      content: { "application/json": { schema: errorSchema } },
    },
  },
});

function formatConfiguration(config: typeof configuration.$inferSelect) {
  return {
    id: config.id,
    category: config.category,
    key: config.key,
    valueType: config.valueType as "int" | "datetime" | "text",
    value: config.value,
    description: config.description,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

export function createConfigurationRoutes() {
  const app = new OpenAPIHono();

  // List configurations
  app.openapi(listConfigurationsRoute, async (c) => {
    const { category } = c.req.valid("query");

    const whereClause = category ? eq(configuration.category, category) : undefined;

    const configs = await db
      .select()
      .from(configuration)
      .where(whereClause)
      .orderBy(configuration.category, configuration.key);

    return c.json(configs.map(formatConfiguration), 200);
  });

  // Get single configuration
  app.openapi(getConfigurationRoute, async (c) => {
    const { category, key } = c.req.valid("param");

    const [config] = await db
      .select()
      .from(configuration)
      .where(and(eq(configuration.category, category), eq(configuration.key, key)));

    if (!config) {
      return c.json({ error: "Configuration not found" }, 404);
    }

    return c.json(formatConfiguration(config), 200);
  });

  // Create configuration
  app.openapi(createConfigurationRoute, async (c) => {
    const body = c.req.valid("json");

    // Check if already exists
    const [existing] = await db
      .select()
      .from(configuration)
      .where(and(eq(configuration.category, body.category), eq(configuration.key, body.key)));

    if (existing) {
      return c.json({ error: "Configuration already exists" }, 409);
    }

    const [created] = await db
      .insert(configuration)
      .values({
        category: body.category,
        key: body.key,
        valueType: body.valueType,
        value: body.value,
        description: body.description,
      })
      .returning();

    return c.json(formatConfiguration(created), 201);
  });

  // Update configuration
  app.openapi(updateConfigurationRoute, async (c) => {
    const { category, key } = c.req.valid("param");
    const body = c.req.valid("json");

    const [updated] = await db
      .update(configuration)
      .set({
        value: body.value,
        description: body.description !== undefined ? body.description : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(configuration.category, category), eq(configuration.key, key)))
      .returning();

    if (!updated) {
      return c.json({ error: "Configuration not found" }, 404);
    }

    return c.json(formatConfiguration(updated), 200);
  });

  // Delete configuration
  app.openapi(deleteConfigurationRoute, async (c) => {
    const { category, key } = c.req.valid("param");

    const [deleted] = await db
      .delete(configuration)
      .where(and(eq(configuration.category, category), eq(configuration.key, key)))
      .returning();

    if (!deleted) {
      return c.json({ error: "Configuration not found" }, 404);
    }

    return c.body(null, 204);
  });

  return app;
}
