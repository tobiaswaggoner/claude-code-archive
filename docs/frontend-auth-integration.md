# Frontend Auth Integration Guide

> API-Dokumentation für die Integration von Better Auth im Frontend (packages/web).

## Architektur

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │  HTTP   │   Backend       │
│   (Next.js)     │ ──────> │   (Hono)        │
│                 │         │                 │
│  Better Auth    │         │  Better Auth    │
│  Client         │         │  Server         │
└─────────────────┘         └─────────────────┘
```

- **Backend-hosted Auth**: Das Backend hostet alle Auth-Endpoints unter `/api/auth/*`
- **Frontend-Client**: Nutzt `better-auth/react` Client, der gegen das Backend authentifiziert
- **Session-Cookies**: Automatisch vom Backend gesetzt, Frontend muss `credentials: 'include'` nutzen

## Konfiguration

### Environment Variables (Frontend)

```bash
# .env.local
NEXT_PUBLIC_ARCHIVE_SERVER_URL=http://localhost:4001

# Für Server-Side API Calls (optional, für SSR)
ARCHIVE_API_KEY=<system-user-api-key>
```

### Better Auth Client Setup

```typescript
// packages/web/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_ARCHIVE_SERVER_URL,
  // Session-Cookie automatisch senden
  fetchOptions: {
    credentials: "include",
  },
});

// Export hooks für React-Komponenten
export const { useSession, signIn, signOut, signUp } = authClient;
```

## Auth Endpoints

Alle Endpoints unter `${ARCHIVE_SERVER_URL}/api/auth/*`:

### Sign Up

```typescript
// Client-seitig
const result = await authClient.signUp.email({
  email: "user@example.com",
  password: "secure-password",
  name: "User Name",
});

// Oder via fetch
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "User Name"
}
```

**Response (Success):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-01-03T12:00:00Z",
    "updatedAt": "2026-01-03T12:00:00Z"
  },
  "session": {
    "id": "uuid",
    "token": "session-token",
    "expiresAt": "2026-02-02T12:00:00Z"
  }
}
```

### Sign In

```typescript
// Client-seitig
const result = await authClient.signIn.email({
  email: "user@example.com",
  password: "secure-password",
});

// Oder via fetch
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response:** Gleiche Struktur wie Sign Up

### Sign Out

```typescript
// Client-seitig
await authClient.signOut();

// Oder via fetch
POST /api/auth/sign-out
```

### Get Session

```typescript
// Client-seitig (React Hook)
const { data: session, isPending, error } = useSession();

// Oder via fetch
GET /api/auth/get-session
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": true,
    "image": null,
    "role": "user"
  },
  "session": {
    "id": "uuid",
    "expiresAt": "2026-02-02T12:00:00Z"
  }
}
```

## React Integration

### Session Provider

```tsx
// packages/web/src/app/providers.tsx
"use client";

import { SessionProvider } from "better-auth/react";
import { authClient } from "@/lib/auth-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider client={authClient}>
      {children}
    </SessionProvider>
  );
}
```

### Protected Routes

```tsx
// packages/web/src/components/protected-route.tsx
"use client";

import { useSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

### Login Form Example

```tsx
"use client";

import { signIn } from "@/lib/auth-client";
import { useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = await signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message);
    } else {
      // Redirect to dashboard
      window.location.href = "/dashboard";
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  );
}
```

## API Calls (nach Authentifizierung)

### Client-seitige API Calls

Session-Cookie wird automatisch mitgesendet:

```typescript
// packages/web/src/lib/api-client.ts
const API_URL = process.env.NEXT_PUBLIC_ARCHIVE_SERVER_URL;

export async function fetchProjects() {
  const response = await fetch(`${API_URL}/api/projects`, {
    credentials: "include", // Cookie mitsenden
  });

  if (response.status === 401) {
    // Session abgelaufen, redirect zu Login
    window.location.href = "/login";
    return;
  }

  return response.json();
}
```

### Server-seitige API Calls (SSR/API Routes)

Für Server-Komponenten oder API Routes den System-API-Key nutzen:

```typescript
// packages/web/src/lib/server-api.ts
const API_URL = process.env.NEXT_PUBLIC_ARCHIVE_SERVER_URL;
const API_KEY = process.env.ARCHIVE_API_KEY;

export async function fetchProjectsServer() {
  const response = await fetch(`${API_URL}/api/projects`, {
    headers: {
      "X-API-Key": API_KEY!,
    },
  });

  return response.json();
}
```

## User Rollen

| Rolle | Beschreibung |
|-------|--------------|
| `admin` | Voller Zugriff, kann User verwalten |
| `user` | Standard-Benutzer, kann alles lesen |
| `system` | Für Backend-zu-Backend (Collectors) |

**Hinweis:** Aktuell keine Daten-Isolation - alle User sehen alle Projekte/Sessions.

## Seeded Users

Nach `pnpm db:seed` existieren:

| Email | Rolle | Auth-Methode |
|-------|-------|--------------|
| `admin@claude-archive.local` | admin | Email/Password |
| `system@claude-archive.local` | system | API-Key |

**Admin-Passwort:** Wird beim Seed-Lauf ausgegeben (oder via `ADMIN_PASSWORD` env var, default: `admin123!`)

## CORS-Konfiguration

Das Backend akzeptiert Requests von konfigurierten Origins:

```bash
# Backend .env
CORS_ORIGINS=http://localhost:3000,https://your-frontend.com
```

Für Entwicklung `*` möglich, für Produktion spezifische Origins.

## Error Responses

```json
// 401 Unauthorized (keine Session/kein API-Key)
{
  "error": "Unauthorized",
  "message": "API key or session required"
}

// 403 Forbidden (ungültiger API-Key)
{
  "error": "Invalid API key"
}

// 400 Bad Request (Validierungsfehler)
{
  "error": "Validation failed",
  "details": { ... }
}
```

## Migration von MockAuthService

1. `MockAuthService` durch `BetterAuthService` ersetzen
2. `authClient` mit korrekter `baseURL` konfigurieren
3. `credentials: "include"` bei allen fetch-Calls
4. Session-Provider in App-Root wrappen
5. DI-Container entsprechend aktualisieren

## Checkliste Frontend

- [ ] `better-auth` installieren: `pnpm add better-auth`
- [ ] `auth-client.ts` erstellen
- [ ] Session Provider in Providers wrappen
- [ ] Login/Logout Pages implementieren
- [ ] Protected Routes einrichten
- [ ] API-Client auf `credentials: "include"` umstellen
- [ ] Server-Side API-Calls mit `X-API-Key` Header

## Timeline

1. **Backend implementiert Auth** (dieser Branch)
2. **Frontend kann parallel mit Mock starten**
3. **Nach Backend-Merge:** Frontend auf echte Auth umstellen
4. **Testen mit seeded Admin-User**
