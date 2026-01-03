# Backend Auth Extension Guide

> Anweisungen zur Erweiterung des Backends (packages/server) für User-Authentifizierung.

## Übersicht

Das Web UI verwendet **Better Auth** für die Authentifizierung. Das Backend muss folgende Funktionalität bereitstellen:

1. User-Tabellen in der Datenbank
2. Auth-Endpoints (optional, wenn Backend die Auth hostet)
3. API-Key Validierung für existierende Endpoints

## Option A: Frontend-Only Auth (Empfohlen für Start)

Das Frontend kann Better Auth standalone betreiben. Das Backend muss nur wissen, welcher User welchen API-Key hat.

### Datenbank-Erweiterung

```sql
-- Neue Tabellen für Better Auth (im Server-Schema)
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  image TEXT,
  api_key TEXT NOT NULL UNIQUE,  -- Für Backend-Calls
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "session" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index für schnelle API-Key Lookups
CREATE INDEX idx_user_api_key ON "user"(api_key);
```

### Drizzle Schema

```typescript
// packages/server/src/db/schema/auth.ts
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  name: text("name"),
  image: text("image"),
  apiKey: text("api_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### API-Key Middleware erweitern

Aktuelle Middleware prüft nur ob API-Key existiert. Erweitern um User-Zuordnung:

```typescript
// packages/server/src/middleware/auth.ts
import { db } from "../db";
import { users } from "../db/schema/auth";
import { eq } from "drizzle-orm";

export async function validateApiKey(apiKey: string) {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.apiKey, apiKey))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

// In Hono Middleware
app.use("/api/*", async (c, next) => {
  const apiKey = c.req.header("X-API-Key");

  if (!apiKey) {
    return c.json({ error: "API key required" }, 401);
  }

  const user = await validateApiKey(apiKey);

  if (!user) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  // User im Context speichern für spätere Verwendung
  c.set("user", user);

  await next();
});
```

### Initial User erstellen

Script zum Erstellen des ersten Users:

```typescript
// packages/server/scripts/create-user.ts
import { db } from "../src/db";
import { users } from "../src/db/schema/auth";
import { randomBytes, createHash } from "crypto";

function generateApiKey(): string {
  return `cca_${randomBytes(24).toString("base64url")}`;
}

function generateUserId(): string {
  return `user_${randomBytes(12).toString("base64url")}`;
}

async function createUser(email: string, name?: string) {
  const apiKey = generateApiKey();
  const id = generateUserId();

  await db.insert(users).values({
    id,
    email,
    name: name ?? email.split("@")[0],
    apiKey,
    emailVerified: true, // Kein Email-Verification für Single-User Setup
  });

  console.log("User created:");
  console.log(`  ID: ${id}`);
  console.log(`  Email: ${email}`);
  console.log(`  API Key: ${apiKey}`);
  console.log("");
  console.log("Add this API key to your .env.local in packages/web:");
  console.log(`  ARCHIVE_API_KEY=${apiKey}`);
}

// Usage: npx tsx scripts/create-user.ts admin@example.com "Admin User"
const [email, name] = process.argv.slice(2);
if (!email) {
  console.error("Usage: npx tsx scripts/create-user.ts <email> [name]");
  process.exit(1);
}
createUser(email, name);
```

## Option B: Backend-Hosted Auth

Falls das Backend die komplette Auth hosten soll (für Multi-User später):

### Better Auth im Backend

```typescript
// packages/server/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  basePath: "/api/auth",

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
  },

  user: {
    additionalFields: {
      apiKey: {
        type: "string",
        required: true,
        defaultValue: () => `cca_${randomBytes(24).toString("base64url")}`,
      },
    },
  },
});
```

### Hono Integration

```typescript
// packages/server/src/routes/auth.ts
import { Hono } from "hono";
import { auth } from "../lib/auth";

const authRoutes = new Hono();

// Better Auth Handler
authRoutes.on(["POST", "GET"], "/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export { authRoutes };
```

### Frontend Anpassung

```typescript
// packages/web/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_ARCHIVE_SERVER_URL, // z.B. http://localhost:4001
});
```

## Environment Variables

### Backend (.env)

```bash
# Bestehend
DATABASE_URL=postgresql://...

# Neu für Auth (wenn Backend-Hosted)
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
```

### Frontend (.env.local)

```bash
# Server URL
NEXT_PUBLIC_ARCHIVE_SERVER_URL=http://localhost:4001

# Für Option A: API Key direkt im Frontend (Single-User)
ARCHIVE_API_KEY=cca_...

# Für Option B: Kein API Key nötig, kommt aus Session
```

## Migrations

```bash
cd packages/server
pnpm db:generate   # Generiert Migration aus Schema
pnpm db:migrate    # Führt Migration aus
```

## Checkliste

- [ ] User-Tabelle hinzufügen
- [ ] Session-Tabelle hinzufügen (für Better Auth)
- [ ] Drizzle Schema erstellen
- [ ] Migration generieren und ausführen
- [ ] API-Key Middleware erweitern
- [ ] create-user Script erstellen
- [ ] Ersten User anlegen
- [ ] API-Key im Frontend konfigurieren

## Aktueller Stand im Frontend

Das Frontend nutzt aktuell `MockAuthService` mit:
- Demo-Credentials: `admin@example.com` / `password123`
- Session in localStorage

Sobald das Backend Auth-ready ist:
1. `MockAuthService` durch `BetterAuthService` ersetzen
2. API-Client mit echtem API-Key konfigurieren
3. DI-Container entsprechend registrieren
