import type { Context, Next } from "hono";
import { db } from "../db/connection.js";
import { authUser } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import { auth, type User, type Session } from "../lib/auth.js";

const API_KEY_HEADER = "X-API-Key";

// Paths that don't require authentication
const PUBLIC_PATHS = [
  "/api/docs",
  "/api/openapi.json",
  "/api/health",
  "/api/auth", // Better Auth endpoints are public (they handle their own auth)
];

// Context variables for authenticated requests
export interface AuthVariables {
  user: User | null;
  session: Session["session"] | null;
  authMethod: "session" | "api_key" | null;
}

/**
 * Dual authentication middleware.
 *
 * Supports two authentication methods:
 * 1. API Key (X-API-Key header) - for collectors and server-to-server
 * 2. Session cookie - for web UI users
 *
 * Public paths are allowed without authentication.
 */
export function dualAuth() {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const path = c.req.path;

    // Skip auth for public paths
    if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
      c.set("user", null);
      c.set("session", null);
      c.set("authMethod", null);
      return next();
    }

    // Try 1: API Key authentication (for collectors)
    const apiKey = c.req.header(API_KEY_HEADER);
    if (apiKey) {
      const user = await authenticateByApiKey(apiKey);
      if (user) {
        c.set("user", user as User);
        c.set("session", null);
        c.set("authMethod", "api_key");
        return next();
      }
      // Invalid API key
      return c.json({ error: "Invalid API key" }, 403);
    }

    // Try 2: Session authentication (for web UI)
    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (session) {
        c.set("user", session.user as User);
        c.set("session", session.session);
        c.set("authMethod", "session");
        return next();
      }
    } catch {
      // Session validation failed, continue to error response
    }

    // No valid authentication
    return c.json(
      { error: "Unauthorized", message: "API key or session required" },
      401
    );
  };
}

/**
 * Authenticate user by API key.
 * Looks up the user in auth_user table by api_key field.
 */
async function authenticateByApiKey(apiKey: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(authUser)
    .where(eq(authUser.apiKey, apiKey));

  if (!user) return null;

  // Return user in the format expected by Better Auth
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified ?? false,
    image: user.image,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  } as User;
}

/**
 * Legacy API key middleware for backwards compatibility.
 * Uses a single shared API key from environment.
 *
 * @deprecated Use dualAuth() instead. This will be removed after migration.
 */
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

/**
 * Middleware to require specific user roles.
 * Must be used after dualAuth() middleware.
 */
export function requireRole(...roles: string[]) {
  return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
    const user = c.get("user");
    // Note: role is a custom field, access via any type assertion
    const userRole = (user as unknown as { role?: string })?.role ?? "user";

    if (!user || !roles.includes(userRole)) {
      return c.json(
        { error: "Forbidden", message: "Insufficient permissions" },
        403
      );
    }

    return next();
  };
}
