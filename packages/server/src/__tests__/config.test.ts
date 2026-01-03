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
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.LOG_LEVEL = "debug";
    process.env.CORS_ORIGINS = "http://localhost:3000";

    const config = loadConfig();

    expect(config.port).toBe(3000);
    expect(config.apiKey).toBe("test-key");
    expect(config.databaseUrl).toBe("postgresql://localhost:5432/test");
    expect(config.logLevel).toBe("debug");
    expect(config.corsOrigins).toBe("http://localhost:3000");
  });

  it("uses defaults for optional values", () => {
    process.env.API_KEY = "test-key";
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";

    const config = loadConfig();

    expect(config.port).toBe(4001);
    expect(config.logLevel).toBe("info");
    expect(config.corsOrigins).toBe("*");
  });

  it("throws on missing required values", () => {
    process.env.API_KEY = "test-key";
    // DATABASE_URL is missing

    expect(() => loadConfig()).toThrow();
  });

  it("throws on invalid DATABASE_URL", () => {
    process.env.API_KEY = "test-key";
    process.env.DATABASE_URL = "not-a-valid-url";

    expect(() => loadConfig()).toThrow();
  });

  it("throws on invalid LOG_LEVEL", () => {
    process.env.API_KEY = "test-key";
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.LOG_LEVEL = "invalid";

    expect(() => loadConfig()).toThrow();
  });

  it("coerces PORT to number", () => {
    process.env.PORT = "8080";
    process.env.API_KEY = "test-key";
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";

    const config = loadConfig();
    expect(typeof config.port).toBe("number");
    expect(config.port).toBe(8080);
  });
});
