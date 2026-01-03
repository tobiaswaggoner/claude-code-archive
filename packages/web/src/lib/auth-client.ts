import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client configured for the archive server
 *
 * Uses NEXT_PUBLIC_ARCHIVE_SERVER_URL as the base URL.
 * Session cookies are automatically sent with credentials: "include".
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_ARCHIVE_SERVER_URL ?? "http://localhost:4001",
  fetchOptions: {
    credentials: "include",
  },
});

// Export hooks and methods for React components
export const {
  useSession,
  signIn,
  signOut,
  signUp,
} = authClient;
