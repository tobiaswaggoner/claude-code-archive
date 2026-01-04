import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock the database module before importing routes
vi.mock("../db/connection.js", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Import after mocking
import { db } from "../db/connection.js";
import { createConfigurationRoutes } from "../routes/configuration.js";

describe("Configuration Routes", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route("/", createConfigurationRoutes());
  });

  describe("GET /configuration", () => {
    it("returns empty array when no configurations exist", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue([]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
      });

      const res = await app.request("/configuration");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
    });

    it("returns configurations filtered by category", async () => {
      const mockConfig = {
        id: "00000000-0000-0000-0000-000000000001",
        category: "summary",
        key: "model",
        valueType: "text",
        value: "anthropic/claude-sonnet-4",
        description: "Model to use",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      };

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockOrderBy = vi.fn().mockResolvedValue([mockConfig]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
      });

      const res = await app.request("/configuration?category=summary");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].category).toBe("summary");
      expect(body[0].key).toBe("model");
    });
  });

  describe("GET /configuration/{category}/{key}", () => {
    it("returns configuration when found", async () => {
      const mockConfig = {
        id: "00000000-0000-0000-0000-000000000001",
        category: "summary",
        key: "model",
        valueType: "text",
        value: "anthropic/claude-sonnet-4",
        description: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      };

      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([mockConfig]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });

      const res = await app.request("/configuration/summary/model");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.category).toBe("summary");
      expect(body.key).toBe("model");
      expect(body.value).toBe("anthropic/claude-sonnet-4");
    });

    it("returns 404 when not found", async () => {
      const mockFrom = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockResolvedValue([]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockFrom,
      });
      mockFrom.mockReturnValue({
        where: mockWhere,
      });

      const res = await app.request("/configuration/summary/nonexistent");

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Configuration not found");
    });
  });

  describe("POST /configuration", () => {
    it("creates new configuration", async () => {
      const mockCreated = {
        id: "00000000-0000-0000-0000-000000000001",
        category: "summary",
        key: "model",
        valueType: "text",
        value: "anthropic/claude-sonnet-4",
        description: "Model to use",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      };

      // Mock check for existing
      const mockSelectFrom = vi.fn().mockReturnThis();
      const mockSelectWhere = vi.fn().mockResolvedValue([]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockSelectFrom,
      });
      mockSelectFrom.mockReturnValue({
        where: mockSelectWhere,
      });

      // Mock insert
      const mockValues = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockCreated]);

      (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: mockValues,
      });
      mockValues.mockReturnValue({
        returning: mockReturning,
      });

      const res = await app.request("/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "summary",
          key: "model",
          value: "anthropic/claude-sonnet-4",
          description: "Model to use",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.category).toBe("summary");
      expect(body.key).toBe("model");
    });

    it("returns 409 when configuration already exists", async () => {
      const existing = {
        id: "00000000-0000-0000-0000-000000000001",
        category: "summary",
        key: "model",
        valueType: "text",
        value: "old-value",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectFrom = vi.fn().mockReturnThis();
      const mockSelectWhere = vi.fn().mockResolvedValue([existing]);

      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: mockSelectFrom,
      });
      mockSelectFrom.mockReturnValue({
        where: mockSelectWhere,
      });

      const res = await app.request("/configuration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "summary",
          key: "model",
          value: "anthropic/claude-sonnet-4",
        }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe("Configuration already exists");
    });
  });

  describe("PUT /configuration/{category}/{key}", () => {
    it("updates existing configuration", async () => {
      const mockUpdated = {
        id: "00000000-0000-0000-0000-000000000001",
        category: "summary",
        key: "model",
        valueType: "text",
        value: "new-model",
        description: "Updated description",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-02T00:00:00Z"),
      };

      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([mockUpdated]);

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: mockSet,
      });
      mockSet.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        returning: mockReturning,
      });

      const res = await app.request("/configuration/summary/model", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: "new-model",
          description: "Updated description",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.value).toBe("new-model");
    });

    it("returns 404 when configuration not found", async () => {
      const mockSet = vi.fn().mockReturnThis();
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([]);

      (db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: mockSet,
      });
      mockSet.mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        returning: mockReturning,
      });

      const res = await app.request("/configuration/summary/nonexistent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: "new-value",
        }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /configuration/{category}/{key}", () => {
    it("deletes existing configuration", async () => {
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([{ id: "1" }]);

      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        returning: mockReturning,
      });

      const res = await app.request("/configuration/summary/model", {
        method: "DELETE",
      });

      expect(res.status).toBe(204);
    });

    it("returns 404 when configuration not found", async () => {
      const mockWhere = vi.fn().mockReturnThis();
      const mockReturning = vi.fn().mockResolvedValue([]);

      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue({
        where: mockWhere,
      });
      mockWhere.mockReturnValue({
        returning: mockReturning,
      });

      const res = await app.request("/configuration/summary/nonexistent", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });
});
