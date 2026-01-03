"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import {
  Container,
  ContainerContext,
  TOKENS,
  container,
  MockAuthService,
  BetterAuthService,
} from "@/core";
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

  // TODO: Register other services when needed
  // target.register(TOKENS.ApiClient, () => new ApiClient());
  // target.register(TOKENS.ProjectsService, () => new ProjectsService());
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
  );
}
