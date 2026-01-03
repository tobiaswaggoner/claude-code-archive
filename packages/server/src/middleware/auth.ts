import type { Context, Next } from "hono";

const API_KEY_HEADER = "X-API-Key";

// Paths that don't require authentication
const PUBLIC_PATHS = ["/api/docs", "/api/openapi.json", "/api/health"];

export function apiKeyAuth(expectedKey: string) {
  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // Skip auth for public paths
    if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
      return next();
    }

    const providedKey = c.req.header(API_KEY_HEADER);

    if (!providedKey) {
      return c.json(
        { error: "Missing API key", message: `${API_KEY_HEADER} header is required` },
        401
      );
    }

    if (providedKey !== expectedKey) {
      return c.json({ error: "Invalid API key" }, 403);
    }

    await next();
  };
}
