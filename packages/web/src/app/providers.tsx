"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Container,
  ContainerContext,
  TOKENS,
  container,
  MockAuthService,
  BetterAuthService,
  ApiClient,
} from "@/core";
import { ProjectsService } from "@/features/projects";
import { SessionsService } from "@/features/sessions";
import { ActivityService } from "@/features/activity";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";

interface ProvidersProps {
  children: ReactNode;
  /** DI overrides for testing */
  diOverrides?: Map<symbol, () => unknown>;
}

/**
 * Auth mode: "mock" uses demo credentials, "backend" connects to Better Auth
 */
const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "mock";

// Create a query client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Register default services in the container
 */
function registerServices(target: Container) {
  // Auth - conditional based on feature flag
  if (AUTH_MODE === "backend") {
    target.register(TOKENS.AuthService, () => new BetterAuthService());
  } else {
    target.register(TOKENS.AuthService, () => new MockAuthService());
  }

  // API Client
  target.register(TOKENS.ApiClient, () => new ApiClient());

  // Feature Services
  target.register(
    TOKENS.ProjectsService,
    () => new ProjectsService(target.resolve(TOKENS.ApiClient))
  );
  target.register(
    TOKENS.SessionsService,
    () => new SessionsService(target.resolve(TOKENS.ApiClient))
  );
  target.register(
    TOKENS.ActivityService,
    () => new ActivityService(target.resolve(TOKENS.ApiClient))
  );
}

export function Providers({ children, diOverrides }: ProvidersProps) {
  const [currentContainer, setCurrentContainer] = useState<Container | null>(null);

  useEffect(() => {
    // Create container with optional overrides
    if (diOverrides) {
      const child = container.createChild(diOverrides);
      registerServices(child);
      setCurrentContainer(child);
    } else {
      registerServices(container);
      setCurrentContainer(container);
    }

    return () => {
      container.clear();
    };
  }, [diOverrides]);

  if (!currentContainer) {
    return null; // Wait for container initialization
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <ContainerContext.Provider value={currentContainer}>
          <TooltipProvider>
            <SidebarProvider defaultOpen={true}>
              {children}
            </SidebarProvider>
          </TooltipProvider>
        </ContainerContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
