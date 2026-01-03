"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInject } from "@/core/di";
import { TOKENS } from "@/core/di/tokens";
import type { AuthService, AuthState } from "./types";

/**
 * Hook for authentication state and actions
 */
export function useAuth() {
  const router = useRouter();
  const authService = useInject<AuthService>(TOKENS.AuthService);

  const [state, setState] = useState<AuthState>({
    session: null,
    isLoading: true,
    error: null,
  });

  // Load session on mount
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const session = await authService.getSession();
        if (mounted) {
          setState({ session, isLoading: false, error: null });
        }
      } catch {
        if (mounted) {
          setState({ session: null, isLoading: false, error: "Failed to load session" });
        }
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, [authService]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await authService.signIn(email, password);

      if (result.error) {
        setState((prev) => ({ ...prev, isLoading: false, error: result.error ?? null }));
        return false;
      }

      const session = await authService.getSession();
      setState({ session, isLoading: false, error: null });
      router.push("/");
      return true;
    },
    [authService, router]
  );

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await authService.signOut();
    setState({ session: null, isLoading: false, error: null });
    router.push("/login");
  }, [authService, router]);

  return {
    ...state,
    signIn,
    signOut,
    isAuthenticated: !!state.session,
  };
}
