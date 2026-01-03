import type { AuthService, Session, User } from "./types";

const MOCK_USER: User = {
  id: "user_1",
  email: "admin@example.com",
  name: "Admin User",
  image: null,
};

const MOCK_PASSWORD = "password123";
const SESSION_KEY = "claude-archive-session";

/**
 * Mock AuthService for development without backend
 * Replace with real BetterAuth implementation later
 */
export class MockAuthService implements AuthService {
  private session: Session | null = null;

  constructor() {
    // Try to restore session from localStorage (client-side only)
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (new Date(parsed.expiresAt) > new Date()) {
            this.session = {
              ...parsed,
              expiresAt: new Date(parsed.expiresAt),
            };
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        } catch {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    }
  }

  async signIn(
    email: string,
    password: string
  ): Promise<{ error?: string }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (email !== MOCK_USER.email) {
      return { error: "User not found" };
    }

    if (password !== MOCK_PASSWORD) {
      return { error: "Invalid password" };
    }

    this.session = {
      user: MOCK_USER,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    // Persist to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    }

    return {};
  }

  async signOut(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    this.session = null;

    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  async getSession(): Promise<Session | null> {
    // Check expiry
    if (this.session && this.session.expiresAt < new Date()) {
      this.session = null;
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
      }
    }

    return this.session;
  }
}
