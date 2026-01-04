import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Container, ContainerContext, TOKENS, MockAuthService } from "@/core";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  diOverrides?: Map<symbol, () => unknown>;
}

/**
 * Custom render function with DI container and providers
 */
function customRender(
  ui: ReactElement,
  { diOverrides, ...options }: CustomRenderOptions = {}
) {
  const container = new Container();

  // Register default services
  container.register(TOKENS.AuthService, () => new MockAuthService());

  // Apply overrides
  diOverrides?.forEach((factory, token) => {
    container.register(token, factory);
  });

  // Create a fresh QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ContainerContext.Provider value={container}>
          <TooltipProvider>
            <SidebarProvider defaultOpen={true}>
              {children}
            </SidebarProvider>
          </TooltipProvider>
        </ContainerContext.Provider>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...options }),
    container,
    queryClient,
  };
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };
