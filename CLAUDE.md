# Claude Code Archive

Multi-host archive and analysis system for Claude Code conversation logs.

## Project Structure

```
packages/
├── parser/      # @claude-archive/parser - Zod-based JSONL parser
├── server/      # API server (PostgreSQL backend)
├── collector/   # Host sync daemon
├── runner/      # Headless session control
└── web/         # NextJS UI (later)
```

## Key Files

- `docs/db-schema.md` - Database schema (10 tables)
- `docs/jsonl-reference.md` - JSONL format documentation with TypeScript types
- `docs/status.md` - Project history and next steps
- `docs/idea.md` - Original requirements (German)

## Parser Usage

```typescript
import { listProjects, parseJsonlFile, parseFullSession } from "@claude-archive/parser";

// List all projects
const projects = await listProjects();

// Parse a session with metadata extraction
const result = await parseJsonlFile("/path/to/session.jsonl");
console.log(result.metadata); // sessionId, models, toolUseCount, etc.
console.log(result.entries);  // Typed Entry[]

// Parse session with all agent sub-sessions
const full = await parseFullSession(projectDir, sessionId);
```

## Server

Hono API with OpenAPI documentation (Scalar UI).

```bash
# Development
cd packages/server
pnpm dev          # Runs on PORT from .env (default 4001)

# API Docs
http://localhost:4001/api/docs

# Database migrations
pnpm db:generate  # Generate migration from schema
pnpm db:migrate   # Apply migrations
```

**Authentication:** `X-API-Key` header required. Public endpoints: `/api/docs`, `/api/openapi.json`, `/api/health`.

**API Endpoints:**
- `GET /health`, `/api/health` - Health check (no auth)
- `GET /api/docs` - Scalar API documentation (no auth)
- `POST /api/collectors/register` - Register collector
- `POST /api/collectors/{id}/heartbeat` - Collector heartbeat
- `POST /api/collectors/{id}/sync` - Sync data from collector
- `GET /api/projects` - List projects
- `GET /api/sessions` - List sessions
- `GET /api/entries/{id}` - Get entry

## Database

PostgreSQL with JSONB. See `docs/db-schema.md` for full schema (10 tables).

```
DATABASE_URL=postgresql://claude_archive:password@192.168.178.202:5432/hiddenstories_development
```

**Local Development:** PostgreSQL on `minix-k3s` (192.168.178.202), namespace `development`, schema `claude_archive`.

## Development

```bash
pnpm install
pnpm build        # Build all packages
pnpm -r dev       # Watch mode
pnpm test:unit    # Run unit tests
```
