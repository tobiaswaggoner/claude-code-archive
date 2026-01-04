import { createRoute, z } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import { loadConfig } from "../lib/config.js";

// Schema for model pricing
const modelPricingSchema = z.object({
  prompt: z.string(),
  completion: z.string(),
  request: z.string().optional(),
  image: z.string().optional(),
  discount: z.number().optional(),
});

// Schema for a single model
const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.number().optional(),
  context_length: z.number().nullable().optional(),
  pricing: modelPricingSchema,
});

// Response schema
const modelsResponseSchema = z.object({
  data: z.array(modelSchema),
});

const errorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

const listModelsRoute = createRoute({
  method: "get",
  path: "/models",
  tags: ["models"],
  summary: "List available AI models",
  description: "Proxies to OpenRouter API to get available models with pricing",
  responses: {
    200: {
      description: "List of available models",
      content: {
        "application/json": {
          schema: modelsResponseSchema,
        },
      },
    },
    503: {
      description: "OpenRouter not configured",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
    502: {
      description: "OpenRouter API error",
      content: {
        "application/json": {
          schema: errorSchema,
        },
      },
    },
  },
});

export function createModelsRoutes() {
  const app = new OpenAPIHono();

  app.openapi(listModelsRoute, async (c) => {
    const config = loadConfig();

    if (!config.openRouterApiUrl || !config.openRouterApiKey) {
      return c.json(
        {
          error: "OpenRouter not configured",
          message: "Set OPENROUTER_API_URL and OPENROUTER_API_KEY environment variables",
        },
        503
      );
    }

    try {
      const response = await fetch(`${config.openRouterApiUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.openRouterApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API error:", response.status, errorText);
        return c.json(
          {
            error: "OpenRouter API error",
            message: `Status ${response.status}: ${errorText}`,
          },
          502
        );
      }

      const data = (await response.json()) as { data: unknown[] };

      // Validate and return only the fields we need
      const validatedData = {
        data: (data.data || []).map((model: unknown) => {
          const m = model as Record<string, unknown>;
          const pricing = m.pricing as Record<string, unknown> || {};
          return {
            id: String(m.id || ""),
            name: String(m.name || ""),
            created: typeof m.created === "number" ? m.created : undefined,
            context_length: typeof m.context_length === "number" ? m.context_length : null,
            pricing: {
              prompt: String(pricing.prompt || "0"),
              completion: String(pricing.completion || "0"),
              request: pricing.request ? String(pricing.request) : undefined,
              image: pricing.image ? String(pricing.image) : undefined,
              discount: typeof pricing.discount === "number" ? pricing.discount : undefined,
            },
          };
        }),
      };

      return c.json(validatedData, 200);
    } catch (error) {
      console.error("Failed to fetch models from OpenRouter:", error);
      return c.json(
        {
          error: "Failed to fetch models",
          message: error instanceof Error ? error.message : String(error),
        },
        502
      );
    }
  });

  return app;
}
