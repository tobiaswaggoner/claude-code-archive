# Authentication

> **Update Januar 2026:** Wir verwenden Better Auth statt NextAuth.js v5.
> Begründung: NextAuth v5 ist immer noch Beta, Hauptentwickler hat aufgehört.
> Better Auth ist stable, TypeScript-first, mit Plugin-System.

## Strategie

**Better Auth** mit Email/Password für den Start. Erweiterbar auf OAuth, Passkeys, MFA später via Plugins.

---

## Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│                                                                  │
│  /login                                                          │
│  ┌──────────────┐                                                │
│  │ Email        │──────────┐                                     │
│  │ Password     │          │                                     │
│  │ [Sign In]    │          │                                     │
│  └──────────────┘          │                                     │
│                            ▼                                     │
│                   POST /api/auth/sign-in/email                   │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BETTER AUTH                                 │
│                                                                  │
│  Validates credentials against DB                                │
│  Creates session (JWT or Database)                               │
│  Sets HTTP-only cookie                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    Redirect to /projects
```

---

## Setup

### Installation

```bash
npm install better-auth
```

### Server Configuration

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  // Email + Password Authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Für Single-User Setup
  },

  // Session Configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,      // Update session daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Rate Limiting
  rateLimit: {
    window: 60,      // 1 minute
    max: 10,         // 10 requests per window
  },
});

// Export type for client
export type Auth = typeof auth;
```

### API Route Handler

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Client Configuration

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
```

---

## Database Schema

Better Auth erstellt automatisch diese Tabellen:

```sql
-- Users
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions
CREATE TABLE "session" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Accounts (für OAuth später)
CREATE TABLE "account" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Verification Tokens
CREATE TABLE "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Custom User Fields

```typescript
// Erweitere User-Schema für API Key
export const auth = betterAuth({
  // ...
  user: {
    additionalFields: {
      apiKey: {
        type: "string",
        required: true,
        defaultValue: () => generateApiKey(),
      },
    },
  },
});
```

---

## Protected Routes

### Middleware

```typescript
// middleware.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function middleware(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAuthRoute = request.url.includes("/login");

  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### Server Component Access

```typescript
// In Server Components
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function ProjectsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // User ist authentifiziert
  const user = session.user;
  // ...
}
```

---

## Client Components

### useSession Hook

```typescript
"use client";

import { useSession } from "@/lib/auth-client";

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  if (!session) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarFallback>{session.user.name?.[0] ?? "U"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{session.user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Login Form

```typescript
"use client";

import { signIn } from "@/lib/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const { error } = await signIn.email({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/projects");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="email" type="email" placeholder="Email" required />
      <Input name="password" type="password" placeholder="Password" required />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}
```

---

## API Client mit Auth

```typescript
// lib/api-client.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function apiClient<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Not authenticated");
  }

  // Hole API Key vom User
  const apiKey = session.user.apiKey;

  const res = await fetch(`${process.env.ARCHIVE_SERVER_URL}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }

  return res.json();
}
```

---

## Initial User Setup (CLI)

```typescript
// scripts/create-user.ts
import { auth } from "../lib/auth";
import { generateApiKey } from "../lib/utils";

async function createUser(email: string, password: string, name?: string) {
  const apiKey = generateApiKey();

  const user = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: name ?? email.split("@")[0],
    },
  });

  // Update user with API key
  // (oder via additionalFields automatisch)

  console.log("User created:");
  console.log(`  Email: ${email}`);
  console.log(`  API Key: ${apiKey}`);
}

// Usage: npx tsx scripts/create-user.ts admin@example.com password123
const [email, password] = process.argv.slice(2);
createUser(email, password);
```

---

## Zukünftige Erweiterungen via Plugins

### Two-Factor Authentication

```typescript
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  // ...
  plugins: [
    twoFactor({
      issuer: "Claude Archive",
    }),
  ],
});
```

### Passkeys (WebAuthn)

```typescript
import { passkey } from "better-auth/plugins";

export const auth = betterAuth({
  // ...
  plugins: [
    passkey(),
  ],
});
```

### OAuth Providers

```typescript
import { github, google } from "better-auth/providers";

export const auth = betterAuth({
  // ...
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

---

## Environment Variables

```bash
# .env.local

# App URL (for auth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Better Auth Secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-secret-here

# Backend Server
ARCHIVE_SERVER_URL=http://localhost:4001
```

---

## Security Checklist

- [x] Passwords mit Argon2 gehasht (Better Auth default)
- [x] Session Token in HttpOnly, Secure, SameSite=Lax Cookie
- [x] CSRF Protection built-in
- [x] Rate Limiting auf Auth-Endpoints
- [x] Session Expiry (30 Tage)
- [x] API Key pro User für Backend-Calls
- [ ] 2FA via Plugin (später)
- [ ] Passkeys via Plugin (später)
- [ ] Password Reset Flow (später)
