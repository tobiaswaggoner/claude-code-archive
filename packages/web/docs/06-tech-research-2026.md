# Tech Stack Research - Januar 2026

> Aktuelle Versionen und Änderungen gegenüber den ursprünglichen Annahmen (basierend auf Trainingsdaten bis Januar 2025)

---

## Zusammenfassung der Änderungen

| Technology | Angenommen | Aktuell | Breaking Changes |
|------------|------------|---------|------------------|
| Next.js | 15.x | **16.1** | `use cache`, React Compiler stable |
| React | 19.0 | **19.2.3** | Activity API neu |
| Tailwind CSS | 3.4.x | **4.1** | CSS-first Config, kein JS mehr! |
| TanStack Query | 5.x | **5.90** | Minor updates |
| NextAuth.js | 5 beta | **5 (immer noch beta)** | Konkurrent: Better Auth |

---

## Next.js 16.1

**Release:** Oktober 2025 (16.0), Dezember 2025 (16.1)

### Neue Features

| Feature | Beschreibung |
|---------|--------------|
| `"use cache"` | Neues Caching-System, expliziter als `revalidate` |
| React Compiler | Stable! Automatisches Memoization |
| Turbopack | Stable für Dev, FS Caching default |
| Layout Deduplication | Shared Layouts nur einmal prefetchen |
| DevTools MCP | Integration mit Claude Code |

### Migration von 15

```bash
# Automatisches Upgrade
npx @next/codemod@canary upgrade latest
```

### Wichtige Änderungen

```typescript
// Neu: "use cache" Directive
async function getData() {
  "use cache";
  return fetch(...);
}

// React Compiler - automatisches Memoization
// Kein useMemo/useCallback mehr nötig!
export default function Component({ data }) {
  // Compiler optimiert automatisch
  const processed = expensiveOperation(data);
  return <div>{processed}</div>;
}
```

**Sources:**
- [Next.js 16.1 Blog](https://nextjs.org/blog/next-16-1)
- [Next.js 16 Blog](https://nextjs.org/blog/next-16)

---

## Tailwind CSS 4.1

**Release:** Januar 2025 (4.0), 2025 (4.1)

### BREAKING: CSS-First Configuration

**Vorher (v3):**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#f97316',
      }
    }
  }
}
```

**Jetzt (v4):**
```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-primary: #f97316;
  --color-background: #0f0f10;
  --font-sans: "Inter", sans-serif;
}
```

### Neue Features

| Feature | Beschreibung |
|---------|--------------|
| `@theme` Directive | Design Tokens direkt in CSS |
| Container Queries | Built-in, kein Plugin mehr |
| 3D Transforms | `rotate-x-*`, `translate-z-*` |
| Text Shadows | `text-shadow-*` Utilities |
| 5x schneller | Neue Engine |

### Setup für Next.js

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* Colors - Orange Accent */
  --color-accent: #f97316;
  --color-accent-hover: #ea580c;
  --color-accent-muted: oklch(0.9 0.1 50);

  /* Anthrazit Background */
  --color-background: #0f0f10;
  --color-background-subtle: #18181b;
  --color-foreground: #fafafa;
  --color-foreground-muted: #a1a1aa;
  --color-border: #27272a;

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Sizing */
  --text-sm: 0.8125rem;  /* 13px */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
}
```

### Dark Mode

```css
@import "tailwindcss";

@theme {
  /* Light mode defaults */
  --color-background: #fafafa;
  --color-foreground: #18181b;
}

@media (prefers-color-scheme: dark) {
  @theme {
    --color-background: #0f0f10;
    --color-foreground: #fafafa;
  }
}

/* Oder mit class-based toggle */
.dark {
  --color-background: #0f0f10;
  --color-foreground: #fafafa;
}
```

**Sources:**
- [Tailwind CSS v4 Blog](https://tailwindcss.com/blog/tailwindcss-v4)
- [Theme Variables Docs](https://tailwindcss.com/docs/theme)

---

## React 19.2

**Release:** Oktober 2025

### Neue Features seit 19.0

| Feature | Beschreibung |
|---------|--------------|
| Server Components | Stable |
| Server Actions | Stable |
| `ref` als Prop | Kein `forwardRef` mehr nötig |
| Activity API | Neu in 19.2 - Hidden/Visible modes |
| DevTools Profiler | Neue Chrome DevTools Tracks |

### Activity API (neu)

```tsx
// Für Tabs, Offscreen Content
<Activity mode={isVisible ? "visible" : "hidden"}>
  <ExpensiveComponent />
</Activity>
```

**Sources:**
- [React 19.2 Blog](https://react.dev/blog/2025/10/01/react-19-2)
- [React Versions](https://react.dev/versions)

---

## Auth: NextAuth vs Better Auth

### NextAuth.js v5 Status

- **Immer noch Beta** (nie stable released)
- Hauptentwickler hat Januar 2025 aufgehört
- Funktioniert, aber Zukunft unsicher
- Wird zu "Auth.js" umbenannt

### Alternative: Better Auth

Neue Library, die 2024 entstanden ist:

| Aspekt | NextAuth v5 | Better Auth |
|--------|-------------|-------------|
| Status | Beta | Stable |
| TypeScript | Gut | Exzellent |
| Plugins | Wenige | Viele (MFA, Passkeys, etc.) |
| Setup | Komplex | Einfach |
| Kosten | Frei | Frei |

### Better Auth Setup

```bash
npm install better-auth
```

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    provider: "postgresql",
    url: process.env.DATABASE_URL,
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    twoFactor(),  // Optional
    passkey(),    // Optional
  ],
});
```

### Empfehlung

**Für dieses Projekt:** Better Auth verwenden

Gründe:
1. Stable, nicht Beta
2. Bessere TypeScript Integration
3. Einfacheres Setup
4. Plugin-System für spätere Erweiterungen (MFA, Passkeys)
5. Aktive Entwicklung

**Sources:**
- [Better Auth Website](https://www.better-auth.com/)
- [Better Auth vs NextAuth Comparison](https://betterstack.com/community/guides/scaling-nodejs/better-auth-vs-nextauth-authjs-vs-autho/)

---

## TanStack Query 5.90

Keine großen Änderungen seit meinen Trainingsdaten, v5 ist stable.

### Wichtige v5 Features (zur Erinnerung)

```typescript
// Neuer Status-Name
const { data, isPending } = useQuery({...}); // nicht isLoading!

// Suspense Support stable
const { data } = useSuspenseQuery({...});

// gcTime statt cacheTime
useQuery({
  queryKey: ['sessions'],
  queryFn: fetchSessions,
  gcTime: 5 * 60 * 1000, // nicht cacheTime!
});
```

**Sources:**
- [TanStack Query](https://tanstack.com/query/latest)

---

## shadcn/ui Updates

- Kompatibel mit Next.js 16
- Kompatibel mit Tailwind v4
- Registry-System für eigene Komponenten
- Middleware renamed zu Proxy

### Installation für Next.js 16 + Tailwind 4

```bash
npx shadcn@latest init
```

Die CLI erkennt automatisch Next.js 16 und Tailwind 4.

**Sources:**
- [shadcn/ui Changelog](https://ui.shadcn.com/docs/changelog)

---

## Aktualisierte package.json

```json
{
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "better-auth": "^1.0.0",
    "@tanstack/react-query": "^5.90.0",
    "@tanstack/react-table": "^8.0.0",
    "lucide-react": "latest",
    "date-fns": "^4.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
    "typescript": "^5.7.0"
  }
}
```

---

## Entscheidungen

| Frage | Entscheidung | Begründung |
|-------|--------------|------------|
| Next.js Version | 16.1 | Aktuell, Turbopack stable |
| Tailwind Version | 4.1 | CSS-first ist besser für Design System |
| Auth Library | Better Auth | Stable, bessere DX als NextAuth v5 beta |
| React Query | 5.90 | Keine Alternative nötig |
| React | 19.2 | Automatisch mit Next.js 16 |
