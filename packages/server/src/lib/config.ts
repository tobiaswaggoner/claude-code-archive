import { z } from "zod";

const configSchema = z.object({
  port: z.coerce.number().default(4001),
  apiKey: z.string().min(1).optional(), // Legacy: will be removed after migration to per-user API keys
  betterAuthSecret: z.string().min(32), // Required: signing key for Better Auth sessions
  databaseUrl: z.string().url(),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  corsOrigins: z.string().default("*"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    port: process.env.PORT,
    apiKey: process.env.API_KEY,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    databaseUrl: process.env.DATABASE_URL,
    logLevel: process.env.LOG_LEVEL,
    corsOrigins: process.env.CORS_ORIGINS,
  });

  if (!result.success) {
    const missing = result.error.issues
      .filter((i) => i.code === "invalid_type" && i.received === "undefined")
      .map((i) => i.path.join("."));

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
    throw new Error(`Configuration error: ${result.error.message}`);
  }

  return result.data;
}
