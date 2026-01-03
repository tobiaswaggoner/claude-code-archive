# Web UI - Technical Overview

## Tech Stack

> Siehe [06-tech-research-2026.md](./06-tech-research-2026.md) für detaillierte Versionsinformationen

| Layer | Technology | Version | Begründung |
|-------|------------|---------|------------|
| Framework | **Next.js** | 16.1 | RSC, `use cache`, React Compiler |
| React | **React** | 19.2 | Server Components, Activity API |
| UI Components | **shadcn/ui** | latest | Headless, volle Kontrolle |
| Styling | **Tailwind CSS** | 4.1 | CSS-first `@theme`, 5x schneller |
| State/Fetching | **TanStack Query** | 5.90 | Caching, Suspense stable |
| Forms | **React Hook Form + Zod** | latest | Type-safe Validation |
| Auth | **Better Auth** | 1.x | Stable, TypeScript-first, Plugin-System |
| Icons | **Lucide React** | latest | Konsistent mit shadcn/ui |
| Tables | **TanStack Table** | 8.x | Virtualisierung, Sorting, Filtering |

---

## Project Structure

> Vollständige Struktur siehe [07-architecture.md](./07-architecture.md)

```
packages/web/src/
├── app/                      # Next.js App Router (thin routing layer)
│   ├── (auth)/login/
│   ├── (dashboard)/          # projects, sessions, repos, collectors, settings
│   ├── api/
│   └── providers.tsx         # DI Container + Global Providers
│
├── core/                     # Shared Kernel
│   ├── di/                   # Dependency Injection Container
│   ├── api/                  # API Client Abstractions
│   ├── auth/                 # Auth Abstractions
│   ├── realtime/             # WebSocket Infrastructure
│   ├── hooks/                # Shared Hooks
│   └── utils/                # Pure Utilities
│
├── features/                 # Feature Slices (Vertical)
│   ├── auth/
│   ├── projects/
│   ├── sessions/
│   ├── git/
│   ├── collectors/
│   └── settings/
│   # Each feature contains:
│   # ├── components/  ├── hooks/  ├── services/  ├── types/  └── __tests__/
│
├── shared/                   # Shared UI Components (Design System)
│   ├── ui/                   # shadcn/ui components
│   ├── layout/               # Shell, Sidebar, Header
│   ├── data/                 # DataTable, CodeBlock, etc.
│   └── feedback/             # EmptyState, ErrorBoundary, etc.
│
└── test/                     # Test Utilities, Mocks, Factories
```

### Architektur-Prinzipien

- **Feature Slices**: Vertikale Schnitte statt horizontale Schichten
- **Dependency Injection**: Loose Coupling, testbar, austauschbar
- **Barrel Exports**: Features exportieren nur Public API via `index.ts`
- **Colocation**: Tests, Types, Utils neben den Komponenten

---

## Key Dependencies

```json
{
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "better-auth": "^1.0.0",
    "@tanstack/react-query": "^5.90.0",
    "@tanstack/react-table": "^8.0.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.24.0",
    "lucide-react": "latest",
    "date-fns": "^4.0.0",
    "nuqs": "^2.0.0",
    "zustand": "^5.0.0",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@playwright/test": "^1.50.0",
    "jsdom": "^25.0.0"
  }
}
```

---

## Spec Documents

| File | Inhalt |
|------|--------|
| [01-design-system.md](./01-design-system.md) | Farben, Typography, Spacing, Tailwind v4 |
| [02-layout.md](./02-layout.md) | Shell, Sidebar, Navigation, Modals |
| [03-components.md](./03-components.md) | UI-Komponenten Katalog |
| [04-views.md](./04-views.md) | Seiten, Routing, API-Anbindung |
| [05-auth.md](./05-auth.md) | Authentifizierung mit Better Auth |
| [06-tech-research-2026.md](./06-tech-research-2026.md) | Aktuelle Versionen, Breaking Changes |
| [07-architecture.md](./07-architecture.md) | Feature Slices, DI, WebSocket, State |

---

## Implementation Order

### Phase 1: Foundation

1. Next.js Projekt Setup
2. Tailwind + Design Tokens
3. shadcn/ui Installation
4. Layout Components (Sidebar, Header)
5. Auth Setup (NextAuth + Backend)

### Phase 2: Core Views

6. Projects List + Detail
7. Sessions List + Viewer
8. ConversationView Component
9. Search (Cmd+K)

### Phase 3: Git Integration

10. Repos View
11. Commits Timeline
12. Branch Badges

### Phase 4: System

13. Collectors View
14. Settings Page
15. Error Handling
16. Loading States

### Phase 5: Polish

17. Dark Mode Tweaks
18. Performance Optimization
19. Keyboard Navigation
20. Mobile Responsive

---

## Backend API Extensions Needed

| Endpoint | Status | Beschreibung |
|----------|--------|--------------|
| `POST /api/auth/login` | TODO | User Auth |
| `GET /api/git-repos` | TODO | Liste aller Repos |
| `GET /api/git-repos/[id]` | TODO | Repo Details |
| `GET /api/git-repos/[id]/branches` | TODO | Branches |
| `GET /api/commits` | TODO | Globale Commit-Liste |
| `GET /api/stats` | TODO | Dashboard Statistiken |

---

## Environment Variables

```bash
# .env.local
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# Backend
ARCHIVE_SERVER_URL=http://localhost:4001
```

---

## Package Manager

**pnpm** - konsistent mit dem restlichen Monorepo.

```bash
cd packages/web
pnpm install
pnpm dev          # http://localhost:3000
```

## Build

```bash
pnpm build
pnpm start        # Production mode
```

---

## Testing

### Strategie

| Layer | Tool | Scope |
|-------|------|-------|
| Unit Tests | **Vitest** | Utilities, Hooks, pure Functions |
| Component Tests | **Vitest + Testing Library** | Isolierte Komponenten |
| E2E / UI Tests | **Playwright** | User Flows, Visual Regression |

### Unit Tests (Vitest)

```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # Coverage report
```

**Coverage Ziel:** >80% für kritische Pfade (auth, api-client, data transformations)

```typescript
// Beispiel: lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { formatTokenCount, normalizeUpstreamUrl } from "./utils";

describe("formatTokenCount", () => {
  it("formats thousands with K suffix", () => {
    expect(formatTokenCount(12345)).toBe("12.3K");
  });

  it("formats millions with M suffix", () => {
    expect(formatTokenCount(1234567)).toBe("1.2M");
  });
});
```

### Component Tests

```typescript
// Beispiel: components/data/RelativeTime.test.tsx
import { render, screen } from "@testing-library/react";
import { RelativeTime } from "./RelativeTime";

describe("RelativeTime", () => {
  it("renders relative time for recent dates", () => {
    const date = new Date(Date.now() - 1000 * 60 * 5); // 5 min ago
    render(<RelativeTime date={date} />);
    expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)

```bash
pnpm test:e2e       # Run Playwright tests
pnpm test:e2e:ui    # Playwright UI mode
```

**Playwright MCP Server** wird für interaktives Testing während der Entwicklung verwendet.

```typescript
// Beispiel: e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("login flow", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/projects");
  await expect(page.locator("h1")).toContainText("Projects");
});
```

### Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules", "src/test"],
    },
  },
});
```

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### CI Integration

```yaml
# In GitHub Actions
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - run: pnpm install
    - run: pnpm test:coverage
    - run: pnpm exec playwright install --with-deps
    - run: pnpm test:e2e
```
