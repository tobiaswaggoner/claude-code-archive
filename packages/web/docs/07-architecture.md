# Architecture

> Skalierbare Struktur für ein wachsendes Projekt

## Prinzipien

1. **Feature Slices** - Vertikale Schnitte statt horizontale Schichten
2. **Dependency Injection** - Loose Coupling, testbar, austauschbar
3. **Shared Kernel** - Gemeinsame Abstractions im Core
4. **Colocation** - Zusammengehöriges zusammen halten
5. **Explicit Dependencies** - Keine versteckten Imports quer durch Features

---

## Projektstruktur

```
packages/web/
├── src/
│   ├── app/                      # Next.js App Router (nur Routing/Layout)
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx      # Thin wrapper → features/auth
│   │   ├── (dashboard)/
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx      # → features/projects
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── sessions/
│   │   │   ├── repos/
│   │   │   ├── collectors/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   └── [...all]/         # Auth API routes
│   │   ├── layout.tsx
│   │   └── providers.tsx         # Global Providers (DI Container)
│   │
│   ├── core/                     # Shared Kernel
│   │   ├── di/                   # Dependency Injection
│   │   │   ├── container.ts      # DI Container
│   │   │   ├── tokens.ts         # Injection Tokens
│   │   │   └── provider.tsx      # React Context Provider
│   │   ├── api/                  # API Client Abstractions
│   │   │   ├── client.ts         # Base API Client
│   │   │   ├── types.ts          # Shared API Types
│   │   │   └── errors.ts         # API Error Handling
│   │   ├── auth/                 # Auth Abstractions
│   │   │   ├── session.ts        # Session Types
│   │   │   └── guard.tsx         # Auth Guard Component
│   │   ├── realtime/             # WebSocket Infrastructure
│   │   │   ├── socket.ts         # WebSocket Client
│   │   │   ├── events.ts         # Event Types
│   │   │   └── provider.tsx      # WebSocket Provider
│   │   ├── hooks/                # Shared Hooks
│   │   │   ├── use-debounce.ts
│   │   │   ├── use-local-storage.ts
│   │   │   └── use-media-query.ts
│   │   └── utils/                # Pure Utilities
│   │       ├── format.ts
│   │       ├── date.ts
│   │       └── url.ts
│   │
│   ├── features/                 # Feature Slices (Vertical)
│   │   ├── auth/
│   │   │   ├── index.ts          # Public API
│   │   │   ├── components/
│   │   │   │   ├── login-form.tsx
│   │   │   │   └── user-menu.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-auth.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   └── __tests__/
│   │   │       └── login-form.test.tsx
│   │   │
│   │   ├── projects/
│   │   │   ├── index.ts          # Public API
│   │   │   ├── components/
│   │   │   │   ├── project-list.tsx
│   │   │   │   ├── project-card.tsx
│   │   │   │   ├── project-detail.tsx
│   │   │   │   └── project-filters.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-projects.ts
│   │   │   │   └── use-project.ts
│   │   │   ├── services/
│   │   │   │   └── projects.service.ts
│   │   │   ├── types/
│   │   │   │   └── project.ts
│   │   │   └── __tests__/
│   │   │
│   │   ├── sessions/
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   ├── session-list.tsx
│   │   │   │   ├── session-viewer.tsx
│   │   │   │   ├── conversation-view.tsx
│   │   │   │   ├── entry-detail.tsx
│   │   │   │   └── tool-call-card.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── __tests__/
│   │   │
│   │   ├── git/
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   ├── repo-list.tsx
│   │   │   │   ├── branch-badge.tsx
│   │   │   │   ├── commit-timeline.tsx
│   │   │   │   └── dirty-files-panel.tsx
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── __tests__/
│   │   │
│   │   ├── collectors/
│   │   │   ├── index.ts
│   │   │   ├── components/
│   │   │   │   ├── collector-grid.tsx
│   │   │   │   ├── collector-card.tsx
│   │   │   │   ├── collector-detail.tsx
│   │   │   │   ├── run-log-viewer.tsx
│   │   │   │   └── sync-status.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-collectors.ts
│   │   │   │   └── use-collector-status.ts  # WebSocket
│   │   │   ├── services/
│   │   │   └── __tests__/
│   │   │
│   │   └── settings/
│   │       ├── index.ts
│   │       ├── components/
│   │       ├── hooks/
│   │       └── services/
│   │
│   ├── shared/                   # Shared UI Components (Design System)
│   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layout/               # Layout Components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── page-header.tsx
│   │   │   └── shell.tsx
│   │   ├── data/                 # Data Display Components
│   │   │   ├── data-table.tsx
│   │   │   ├── key-value.tsx
│   │   │   ├── relative-time.tsx
│   │   │   ├── status-badge.tsx
│   │   │   ├── token-counter.tsx
│   │   │   └── code-block.tsx
│   │   └── feedback/             # Feedback Components
│   │       ├── empty-state.tsx
│   │       ├── error-boundary.tsx
│   │       ├── loading-skeleton.tsx
│   │       └── toast.tsx
│   │
│   └── test/                     # Test Utilities
│       ├── setup.ts
│       ├── mocks/
│       │   ├── handlers.ts       # MSW Handlers
│       │   └── server.ts
│       └── utils/
│           ├── render.tsx        # Custom render with providers
│           └── factories.ts      # Test data factories
│
├── e2e/                          # Playwright Tests
│   ├── auth.spec.ts
│   ├── projects.spec.ts
│   └── sessions.spec.ts
│
└── public/
```

---

## Dependency Injection

### Warum DI in React/Next.js?

- **Testbarkeit**: Services mocken ohne jest.mock Hacks
- **Austauschbarkeit**: API Client, WebSocket, etc. austauschen
- **Explizite Abhängigkeiten**: Klar was eine Komponente braucht
- **Server/Client Boundary**: Unterschiedliche Implementierungen

### Container Implementation

```typescript
// core/di/tokens.ts
export const TOKENS = {
  ApiClient: Symbol("ApiClient"),
  AuthService: Symbol("AuthService"),
  WebSocketClient: Symbol("WebSocketClient"),
  ProjectsService: Symbol("ProjectsService"),
  SessionsService: Symbol("SessionsService"),
  CollectorsService: Symbol("CollectorsService"),
} as const;
```

```typescript
// core/di/container.ts
type Token = symbol;
type Factory<T> = () => T;

class Container {
  private factories = new Map<Token, Factory<unknown>>();
  private instances = new Map<Token, unknown>();

  register<T>(token: Token, factory: Factory<T>): void {
    this.factories.set(token, factory);
  }

  resolve<T>(token: Token): T {
    // Singleton pattern
    if (this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`No factory registered for token: ${token.toString()}`);
    }

    const instance = factory() as T;
    this.instances.set(token, instance);
    return instance;
  }

  // Für Tests: Container zurücksetzen
  reset(): void {
    this.instances.clear();
  }
}

export const container = new Container();
```

```typescript
// core/di/provider.tsx
"use client";

import { createContext, useContext, useMemo } from "react";
import { container, Container } from "./container";
import { TOKENS } from "./tokens";

const DIContext = createContext<Container>(container);

export function DIProvider({
  children,
  overrides,
}: {
  children: React.ReactNode;
  overrides?: Map<symbol, () => unknown>;
}) {
  const containerInstance = useMemo(() => {
    if (!overrides) return container;

    // Create child container with overrides (für Tests)
    const child = new Container();
    // Copy parent registrations
    // Apply overrides
    return child;
  }, [overrides]);

  return (
    <DIContext.Provider value={containerInstance}>
      {children}
    </DIContext.Provider>
  );
}

export function useInject<T>(token: symbol): T {
  const container = useContext(DIContext);
  return container.resolve<T>(token);
}
```

### Service Registration

```typescript
// app/providers.tsx
"use client";

import { DIProvider } from "@/core/di/provider";
import { container } from "@/core/di/container";
import { TOKENS } from "@/core/di/tokens";
import { ApiClient } from "@/core/api/client";
import { WebSocketClient } from "@/core/realtime/socket";
import { ProjectsService } from "@/features/projects/services/projects.service";

// Register all services
container.register(TOKENS.ApiClient, () => new ApiClient());
container.register(TOKENS.WebSocketClient, () => new WebSocketClient());
container.register(TOKENS.ProjectsService, () =>
  new ProjectsService(container.resolve(TOKENS.ApiClient))
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DIProvider>
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </QueryClientProvider>
    </DIProvider>
  );
}
```

### Usage in Features

```typescript
// features/projects/hooks/use-projects.ts
import { useInject } from "@/core/di/provider";
import { TOKENS } from "@/core/di/tokens";
import { useQuery } from "@tanstack/react-query";
import type { ProjectsService } from "../services/projects.service";

export function useProjects(options?: { search?: string }) {
  const projectsService = useInject<ProjectsService>(TOKENS.ProjectsService);

  return useQuery({
    queryKey: ["projects", options],
    queryFn: () => projectsService.list(options),
  });
}
```

### Testing with DI

```typescript
// features/projects/__tests__/project-list.test.tsx
import { render, screen } from "@/test/utils/render";
import { ProjectList } from "../components/project-list";
import { TOKENS } from "@/core/di/tokens";

const mockProjectsService = {
  list: vi.fn().mockResolvedValue({
    items: [{ id: "1", name: "Test Project" }],
    total: 1,
  }),
};

test("renders projects", async () => {
  render(<ProjectList />, {
    diOverrides: new Map([
      [TOKENS.ProjectsService, () => mockProjectsService],
    ]),
  });

  expect(await screen.findByText("Test Project")).toBeInTheDocument();
});
```

---

## Feature Slice Anatomy

Jedes Feature ist ein eigenständiges Modul:

```
features/sessions/
├── index.ts              # Public API - nur das exportieren was andere brauchen
├── components/           # React Components (UI)
│   ├── session-list.tsx
│   └── session-viewer.tsx
├── hooks/                # React Hooks (Logik)
│   ├── use-sessions.ts
│   └── use-session-entries.ts
├── services/             # Business Logic (Framework-agnostic)
│   └── sessions.service.ts
├── types/                # TypeScript Types
│   ├── session.ts
│   └── entry.ts
├── utils/                # Feature-spezifische Utilities
│   └── parse-entry.ts
└── __tests__/            # Colocated Tests
    ├── session-list.test.tsx
    └── sessions.service.test.ts
```

### Public API (index.ts)

```typescript
// features/sessions/index.ts

// Components
export { SessionList } from "./components/session-list";
export { SessionViewer } from "./components/session-viewer";

// Hooks
export { useSessions } from "./hooks/use-sessions";
export { useSession } from "./hooks/use-session";

// Types (wenn von anderen Features gebraucht)
export type { Session, Entry } from "./types";

// NICHT exportieren: interne Components, Services, Utils
```

### Import Rules

```typescript
// ✅ Erlaubt: Feature importiert aus core
import { useInject } from "@/core/di/provider";
import { ApiClient } from "@/core/api/client";

// ✅ Erlaubt: Feature importiert aus shared
import { DataTable } from "@/shared/data/data-table";
import { Button } from "@/shared/ui/button";

// ✅ Erlaubt: Feature importiert Public API eines anderen Features
import { useProject } from "@/features/projects";

// ❌ Verboten: Direkter Import in Feature-Internals
import { ProjectCard } from "@/features/projects/components/project-card";

// ❌ Verboten: Zirkuläre Dependencies
// projects → sessions → projects
```

---

## WebSocket Infrastructure

### Core WebSocket Client

```typescript
// core/realtime/socket.ts
import { EventEmitter } from "events";

export type SocketEvent =
  | { type: "collector:status"; data: CollectorStatus }
  | { type: "session:new"; data: { sessionId: string } }
  | { type: "sync:progress"; data: SyncProgress };

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private url: string) {
    super();
  }

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit("connected");
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as SocketEvent;
      this.emit(data.type, data.data);
    };

    this.ws.onclose = () => {
      this.emit("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      this.emit("error", error);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit("reconnect:failed");
      return;
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;

    setTimeout(() => this.connect(), delay);
  }

  send(event: SocketEvent): void {
    this.ws?.send(JSON.stringify(event));
  }

  disconnect(): void {
    this.ws?.close();
  }
}
```

### WebSocket Provider

```typescript
// core/realtime/provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useInject } from "@/core/di/provider";
import { TOKENS } from "@/core/di/tokens";
import type { WebSocketClient, SocketEvent } from "./socket";

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: <T extends SocketEvent["type"]>(
    event: T,
    callback: (data: Extract<SocketEvent, { type: T }>["data"]) => void
  ) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const client = useInject<WebSocketClient>(TOKENS.WebSocketClient);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    client.connect();

    client.on("connected", () => setIsConnected(true));
    client.on("disconnected", () => setIsConnected(false));

    return () => client.disconnect();
  }, [client]);

  const subscribe = <T extends SocketEvent["type"]>(
    event: T,
    callback: (data: Extract<SocketEvent, { type: T }>["data"]) => void
  ) => {
    client.on(event, callback);
    return () => client.off(event, callback);
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocket must be within WebSocketProvider");
  return context;
}
```

### Usage in Features

```typescript
// features/collectors/hooks/use-collector-status.ts
import { useEffect, useState } from "react";
import { useWebSocket } from "@/core/realtime/provider";
import type { CollectorStatus } from "../types";

export function useCollectorStatus(collectorId: string) {
  const { subscribe, isConnected } = useWebSocket();
  const [status, setStatus] = useState<CollectorStatus | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe("collector:status", (data) => {
      if (data.collectorId === collectorId) {
        setStatus(data);
      }
    });

    return unsubscribe;
  }, [collectorId, isConnected, subscribe]);

  return { status, isConnected };
}
```

---

## State Management

### Strategie

| State Type | Solution |
|------------|----------|
| Server State | TanStack Query |
| URL State | nuqs (type-safe URL params) |
| UI State | React useState/useReducer |
| Global UI State | Zustand (minimal) |
| Real-time State | WebSocket + TanStack Query invalidation |

### Zustand für globalen UI State

```typescript
// core/stores/ui.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      theme: "system",
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "ui-preferences" }
  )
);
```

### URL State mit nuqs

```typescript
// features/sessions/hooks/use-session-filters.ts
import { useQueryState, parseAsString, parseAsBoolean } from "nuqs";

export function useSessionFilters() {
  const [projectId, setProjectId] = useQueryState("project", parseAsString);
  const [mainOnly, setMainOnly] = useQueryState(
    "mainOnly",
    parseAsBoolean.withDefault(false)
  );

  return {
    projectId,
    setProjectId,
    mainOnly,
    setMainOnly,
  };
}
```

---

## Error Handling

### Error Boundary per Feature

```typescript
// features/sessions/components/session-list.tsx
import { ErrorBoundary } from "@/shared/feedback/error-boundary";

export function SessionListPage() {
  return (
    <ErrorBoundary
      fallback={<SessionListError />}
      onError={(error) => logError("sessions", error)}
    >
      <SessionList />
    </ErrorBoundary>
  );
}
```

### API Error Handling

```typescript
// core/api/errors.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  static isNotFound(error: unknown): error is ApiError {
    return error instanceof ApiError && error.status === 404;
  }

  static isUnauthorized(error: unknown): error is ApiError {
    return error instanceof ApiError && error.status === 401;
  }
}
```

---

## Summary: Key Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Structure | Feature Slices | Scalability, Colocation |
| DI | Custom Container | Simplicity, Testability |
| Server State | TanStack Query | Caching, Mutations |
| URL State | nuqs | Type-safe, Shareable URLs |
| UI State | Zustand | Minimal, Persistent |
| Real-time | WebSocket + Events | Collector Status, Live Updates |
| Testing | Vitest + DI Mocks | No jest.mock, Clean Tests |
| Imports | Barrel Exports | Encapsulation, Refactoring |
