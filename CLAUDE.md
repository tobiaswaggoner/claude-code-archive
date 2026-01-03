# Claude Code Archive

Multi-host archive and analysis system for Claude Code conversation logs.

## Project Structure

```
packages/
├── parser/      # @claude-archive/parser - Zod-based JSONL parser
├── server/      # API server (PostgreSQL backend)
├── collector/   # CLI sync tool (manual or cron)
├── runner/      # Headless session control
└── web/         # Next.js 16 UI (siehe UI-PRIME.md)
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
- `GET /api/collectors/{id}/session-state` - Session state for delta sync
- `GET /api/collectors/{id}/commit-state` - Commit state for delta sync

## Collector

CLI tool for syncing Claude Code sessions and Git repositories to the server.

```bash
# Sync only Claude sessions (from ~/.claude/projects)
collector sync

# Sync Claude sessions + Git repos from specified directories
collector sync --source-dir=/home/user/src --source-dir=/home/user/projects

# Options
collector sync --verbose      # Debug output
collector sync --dry-run      # Preview without sending
collector sync --help         # Show help
```

**Environment Variables:**
```bash
CLAUDE_ARCHIVE_SERVER_URL=https://archive.example.com  # Required
CLAUDE_ARCHIVE_API_KEY=your-api-key                    # Required
CLAUDE_ARCHIVE_COLLECTOR_NAME=my-desktop               # Optional (default: hostname)
CLAUDE_ARCHIVE_LOG_LEVEL=debug                         # Optional (default: info)
```

**Features:**
- Auto-registration with server on first run
- Delta sync: only sends new entries/commits
- Git repo discovery with branch tracking (ahead/behind)
- Tool results synchronization (text and binary)
- Graceful error handling (continues on individual failures)

## Database

PostgreSQL with JSONB. See `docs/db-schema.md` for full schema (10 tables).

```
DATABASE_URL=postgresql://claude_archive:password@192.168.178.202:5432/hiddenstories_development
```

**Local Development:** PostgreSQL on `minix-k3s` (192.168.178.202), namespace `development`, schema `claude_archive`.

## Web UI

Next.js 16 Backoffice Application.

**Für UI-Arbeit:** Lies zuerst `packages/web/UI-PRIME.md` - das gibt dir Orientierung ohne alle Specs laden zu müssen.

```bash
cd packages/web
pnpm dev          # localhost:3000
pnpm test         # Vitest
pnpm test:e2e     # Playwright
```

**Specs:** `packages/web/docs/` (Design System, Layout, Components, Views, Auth, Architecture)

## Development

```bash
pnpm install
pnpm build        # Build all packages
pnpm -r dev       # Watch mode
pnpm test:unit    # Run unit tests
```
