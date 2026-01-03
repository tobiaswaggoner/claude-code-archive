"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Container, ContainerContext, TOKENS, container, MockAuthService } from "@/core";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";

interface ProvidersProps {
  children: ReactNode;
  /** DI overrides for testing */
  diOverrides?: Map<symbol, () => unknown>;
}

/**
 * Register default services in the container
 */
function registerServices(target: Container) {
  // Auth - using mock for now
  target.register(TOKENS.AuthService, () => new MockAuthService());

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
