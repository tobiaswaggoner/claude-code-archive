import { z } from "zod";
import { getEffectiveHostname } from "./utils/hostname.js";

const configSchema = z.object({
  serverUrl: z.string().url(),
  apiKey: z.string().min(1),
  collectorName: z.string().default(() => getEffectiveHostname()),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    serverUrl: process.env.CLAUDE_ARCHIVE_SERVER_URL,
    apiKey: process.env.CLAUDE_ARCHIVE_API_KEY,
    collectorName: process.env.CLAUDE_ARCHIVE_COLLECTOR_NAME,
    logLevel: process.env.CLAUDE_ARCHIVE_LOG_LEVEL,
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
