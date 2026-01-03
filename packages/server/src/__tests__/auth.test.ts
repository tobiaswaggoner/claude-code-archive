import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { apiKeyAuth } from "../middleware/auth.js";

describe("apiKeyAuth middleware", () => {
  const createApp = (apiKey: string) => {
    const app = new Hono();
    app.use("*", apiKeyAuth(apiKey));
    app.get("/test", (c) => c.json({ ok: true }));
    app.get("/api/docs", (c) => c.json({ docs: true }));
    app.get("/api/openapi.json", (c) => c.json({ openapi: "3.1.0" }));
    app.get("/api/health", (c) => c.json({ status: "ok" }));
    return app;
  };

  it("allows requests with valid API key", async () => {
    const app = createApp("valid-key");

    const res = await app.request("/test", {
      headers: { "X-API-Key": "valid-key" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects requests without API key", async () => {
    const app = createApp("valid-key");

    const res = await app.request("/test");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Missing API key");
  });

  it("rejects requests with invalid API key", async () => {
    const app = createApp("valid-key");

    const res = await app.request("/test", {
      headers: { "X-API-Key": "wrong-key" },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Invalid API key");
  });

  it("is case-sensitive for API keys", async () => {
    const app = createApp("Valid-Key");

    const res = await app.request("/test", {
      headers: { "X-API-Key": "valid-key" },
    });

    expect(res.status).toBe(403);
  });

  it("allows /api/docs without auth", async () => {
    const app = createApp("valid-key");

    const res = await app.request("/api/docs");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ docs: true });
  });

  it("allows /api/openapi.json without auth", async () => {
    const app = createApp("valid-key");

    const res = await app.request("/api/openapi.json");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ openapi: "3.1.0" });
  });

  it("allows /api/health without auth", async () => {
    const app = createApp("valid-key");

    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
