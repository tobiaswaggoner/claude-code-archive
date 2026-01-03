import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../lib/config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads config from environment variables", () => {
    process.env.PORT = "3000";
    process.env.API_KEY = "test-key";
    process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.LOG_LEVEL = "debug";
    process.env.CORS_ORIGINS = "http://localhost:3000";

    const config = loadConfig();

    expect(config.port).toBe(3000);
    expect(config.apiKey).toBe("test-key");
    expect(config.betterAuthSecret).toBe("test-secret-that-is-at-least-32-characters-long");
    expect(config.databaseUrl).toBe("postgresql://localhost:5432/test");
    expect(config.logLevel).toBe("debug");
    expect(config.corsOrigins).toBe("http://localhost:3000");
  });

  it("uses defaults for optional values", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";

    const config = loadConfig();

    expect(config.port).toBe(4001);
    expect(config.apiKey).toBeUndefined(); // API_KEY is now optional
    expect(config.logLevel).toBe("info");
    expect(config.corsOrigins).toBe("*");
  });

  it("throws on missing required values", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
    // DATABASE_URL is missing

    expect(() => loadConfig()).toThrow();
  });

  it("throws on invalid DATABASE_URL", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
    process.env.DATABASE_URL = "not-a-valid-url";

    expect(() => loadConfig()).toThrow();
  });

  it("throws on invalid LOG_LEVEL", () => {
    process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.LOG_LEVEL = "invalid";

    expect(() => loadConfig()).toThrow();
  });

  it("coerces PORT to number", () => {
    process.env.PORT = "8080";
    process.env.BETTER_AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";

    const config = loadConfig();
    expect(typeof config.port).toBe("number");
    expect(config.port).toBe(8080);
  });
});
