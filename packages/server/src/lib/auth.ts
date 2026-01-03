import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/connection.js";
import {
  authUser,
  authSession,
  authAccount,
  authVerification,
} from "../db/schema/index.js";

/**
 * Better Auth configuration for the server.
 *
 * Uses custom table names (auth_user, auth_session, etc.) in the claude_archive schema.
 * Supports email/password authentication for web UI users.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Skip email verification for now
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Update session every day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Secret for signing tokens (from environment)
  secret: process.env.BETTER_AUTH_SECRET,

  // Base path for auth endpoints
  basePath: "/api/auth",

  // Trust proxy headers (for running behind reverse proxy)
  trustedOrigins: process.env.CORS_ORIGINS?.split(",") || ["*"],

  // Advanced options
  advanced: {
    database: {
      // Let database generate UUIDs (our schema uses uuid().defaultRandom())
      generateId: false,
    },
  },

  // Note: Additional user fields (api_key, role) are in our custom schema.
  // Better Auth uses these automatically since they're defined in authUser table.
});

// Export types for use in middleware
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
