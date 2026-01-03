import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockAuthService } from "../mock-auth-service";

describe("MockAuthService", () => {
  let authService: MockAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage mock
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    authService = new MockAuthService();
  });

  describe("signIn", () => {
    it("should sign in with valid credentials", async () => {
      const result = await authService.signIn(
        "admin@example.com",
        "password123"
      );

      expect(result.error).toBeUndefined();
    });

    it("should return error for invalid email", async () => {
      const result = await authService.signIn(
        "wrong@example.com",
        "password123"
      );

      expect(result.error).toBe("User not found");
    });

    it("should return error for invalid password", async () => {
      const result = await authService.signIn(
        "admin@example.com",
        "wrongpassword"
      );

      expect(result.error).toBe("Invalid password");
    });

    it("should create a session after successful login", async () => {
      await authService.signIn("admin@example.com", "password123");

      const session = await authService.getSession();

      expect(session).not.toBeNull();
      expect(session?.user.email).toBe("admin@example.com");
    });
  });

  describe("signOut", () => {
    it("should clear the session", async () => {
      await authService.signIn("admin@example.com", "password123");
      await authService.signOut();

      const session = await authService.getSession();

      expect(session).toBeNull();
    });
  });

  describe("getSession", () => {
    it("should return null when not authenticated", async () => {
      const session = await authService.getSession();

      expect(session).toBeNull();
    });

    it("should return session after login", async () => {
      await authService.signIn("admin@example.com", "password123");

      const session = await authService.getSession();

      expect(session).not.toBeNull();
      expect(session?.user.id).toBe("user_1");
      expect(session?.user.name).toBe("Admin User");
    });
  });
});
