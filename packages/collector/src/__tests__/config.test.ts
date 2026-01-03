import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadConfig } from "../config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load config from environment variables", () => {
    process.env.CLAUDE_ARCHIVE_SERVER_URL = "https://api.example.com";
    process.env.CLAUDE_ARCHIVE_API_KEY = "test-api-key";
    process.env.CLAUDE_ARCHIVE_COLLECTOR_NAME = "test-collector";
    process.env.CLAUDE_ARCHIVE_LOG_LEVEL = "debug";

    const config = loadConfig();

    expect(config.serverUrl).toBe("https://api.example.com");
    expect(config.apiKey).toBe("test-api-key");
    expect(config.collectorName).toBe("test-collector");
    expect(config.logLevel).toBe("debug");
  });

  it("should use default values for optional fields", () => {
    process.env.CLAUDE_ARCHIVE_SERVER_URL = "https://api.example.com";
    process.env.CLAUDE_ARCHIVE_API_KEY = "test-api-key";
    delete process.env.CLAUDE_ARCHIVE_COLLECTOR_NAME;
    delete process.env.CLAUDE_ARCHIVE_LOG_LEVEL;

    const config = loadConfig();

    expect(config.serverUrl).toBe("https://api.example.com");
    expect(config.apiKey).toBe("test-api-key");
    expect(config.collectorName).toBeTruthy(); // defaults to hostname
    expect(config.logLevel).toBe("info");
  });

  it("should throw error when serverUrl is missing", () => {
    delete process.env.CLAUDE_ARCHIVE_SERVER_URL;
    process.env.CLAUDE_ARCHIVE_API_KEY = "test-api-key";

    expect(() => loadConfig()).toThrow("Missing required environment variables: serverUrl");
  });

  it("should throw error when apiKey is missing", () => {
    process.env.CLAUDE_ARCHIVE_SERVER_URL = "https://api.example.com";
    delete process.env.CLAUDE_ARCHIVE_API_KEY;

    expect(() => loadConfig()).toThrow("Missing required environment variables: apiKey");
  });

  it("should throw error when both required fields are missing", () => {
    delete process.env.CLAUDE_ARCHIVE_SERVER_URL;
    delete process.env.CLAUDE_ARCHIVE_API_KEY;

    expect(() => loadConfig()).toThrow(/Missing required environment variables.*serverUrl.*apiKey/);
  });

  it("should throw error for invalid serverUrl", () => {
    process.env.CLAUDE_ARCHIVE_SERVER_URL = "not-a-url";
    process.env.CLAUDE_ARCHIVE_API_KEY = "test-api-key";

    expect(() => loadConfig()).toThrow("Configuration error");
  });

  it("should throw error for invalid logLevel", () => {
    process.env.CLAUDE_ARCHIVE_SERVER_URL = "https://api.example.com";
    process.env.CLAUDE_ARCHIVE_API_KEY = "test-api-key";
    process.env.CLAUDE_ARCHIVE_LOG_LEVEL = "invalid";

    expect(() => loadConfig()).toThrow("Configuration error");
  });

  it("should accept all valid log levels", () => {
    process.env.CLAUDE_ARCHIVE_SERVER_URL = "https://api.example.com";
    process.env.CLAUDE_ARCHIVE_API_KEY = "test-api-key";

    for (const level of ["debug", "info", "warn", "error"]) {
      process.env.CLAUDE_ARCHIVE_LOG_LEVEL = level;
      const config = loadConfig();
      expect(config.logLevel).toBe(level);
    }
  });
});
