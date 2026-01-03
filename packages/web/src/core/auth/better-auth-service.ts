import type { AuthService, Session } from "./types";
import { authClient } from "@/lib/auth-client";

/**
 * AuthService implementation using Better Auth
 *
 * Connects to the backend's Better Auth endpoints at /api/auth/*
 * Session is managed via HTTP-only cookies set by the backend.
 */
export class BetterAuthService implements AuthService {
  async signIn(
    email: string,
    password: string
  ): Promise<{ error?: string }> {
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        return { error: result.error.message ?? "Sign in failed" };
      }

      return {};
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      return { error: message };
    }
  }

  async signOut(): Promise<void> {
    try {
      await authClient.signOut();
    } catch {
      // Ignore signout errors - user is effectively logged out
    }
  }

  async getSession(): Promise<Session | null> {
    try {
      const result = await authClient.getSession();

      if (!result.data?.user) {
        return null;
      }

      const { user, session } = result.data;

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        },
        expiresAt: new Date(session.expiresAt),
      };
    } catch {
      return null;
    }
  }
}
