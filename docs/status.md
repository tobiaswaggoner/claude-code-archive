# Project Status

## History

### 2026-01-03 17:45 - Sync State API Optimization

Consolidated N+M delta-sync API calls into single call:

**Before:** Per-repo and per-workspace calls
- `GET /api/collectors/{id}/session-state?host=X&cwd=Y` (per workspace)
- `GET /api/collectors/{id}/commit-state?host=X&path=Y` (per repo)

**After:** Single call for all state
- `GET /api/collectors/{id}/sync-state?host=X`
- Returns: `{ gitRepos: { path: [shas] }, workspaces: { cwd: [sessions] } }`

Removed deprecated endpoints and tests. 163 tests passing (32 server + 131 collector).

### 2026-01-03 17:15 - Multi-Host Sync & Idempotency

Successfully synced from both WSL and Windows collectors. Fixed several issues to achieve reliable delta sync:

**Batch Sync (Payload Size):**
- Git repos sent in batches of 10
- Workspaces sent individually
- Sessions chunked to max 50 per request (`SESSION_BATCH_SIZE`)
- Prevents "Invalid string length" and heap overflow errors

**Delta Sync Fixes:**
- Changed commit-state lookup from `upstreamUrl` to `(host, path)` - more reliable
- Extract real `cwd` from JSONL files before session-state lookup (fixes Windows path issues)
- Added UNIQUE constraints: `session(workspace_id, original_session_id)`, `entry(session_id, line_number)`

**Data Sanitization:**
- DateTime normalization for Git commits (`Date.parse()` → `toISOString()`)
- Null byte removal for PostgreSQL JSONB (`\u0000` not supported)

**Verified Status (after 2 sync runs):**
| Table | Count |
|-------|-------|
| collector | 2 |
| project | 173 |
| workspace | 83 |
| session | 1,642 |
| entry | 70,948 |
| git_repo | 140 |
| git_branch | 26 |
| git_commit | 11,237 |

**Idempotency confirmed:** Second sync run produced 0 new entries/commits.

### 2026-01-03 18:00 - Collector Package Implementation

- Created `@claude-archive/collector` CLI package
- Git repository discovery with recursive search
- Branch tracking with ahead/behind counts
- Delta sync: queries server for known entries/commits before syncing
- Tool results synchronization (text and binary)
- Server endpoint for delta detection:
  - `GET /api/collectors/{id}/sync-state`
- 163 total unit tests (32 server + 131 collector)

**Usage:**
```bash
# Set environment
export CLAUDE_ARCHIVE_SERVER_URL=http://localhost:4001
export CLAUDE_ARCHIVE_API_KEY=your-key

# Sync Claude sessions only
collector sync

# Sync with Git repos
collector sync --source-dir=~/src
```

### 2026-01-03 16:00 - Server Package Implementation

- Created `@claude-archive/server` package with Hono API
- Drizzle ORM with all 10 tables from schema
- OpenAPI documentation with Scalar UI (API key input supported)
- API Key authentication middleware (public: docs, health, openapi.json)
- Collector endpoints: register, heartbeat, sync, logs
- Project/Session/Entry read endpoints
- Database migrations created and applied
- 29 unit tests passing

**PostgreSQL Setup:**
- Schema `claude_archive` on minix-k3s (192.168.178.202)
- User: `claude_archive`, DB: `hiddenstories_development`

### 2026-01-03 14:30 - Database Schema Design

- Designed 10-table PostgreSQL schema (`docs/db-schema.md`)
- Central entity: Project (Git AND/OR Claude)
- GitRepo with dirty_snapshot for uncommitted changes tracking
- GitBranch per GitRepo (not project-wide) for unpushed branch tracking
- upstream_url normalization for project matching
- Entry stores complete JSONL in `data` (JSONB), minimal field extraction
- ToolResult table for large outputs from `tool-results/` folder

**Decisions:**
- Redundant fields (is_agent, is_pushed) computed, not stored
- Own UUIDs generated, original IDs stored separately
- Rebase/force-push detection via parent-traversal
- Stale branches: 30 days default, runtime-configurable

### 2026-01-03 12:00 - Project Bootstrap & Parser Implementation

- Analyzed 6 open-source Claude Code JSONL parsers via subagents
- Analyzed local `~/.claude/projects` directory structure
- Created comprehensive JSONL format reference (`docs/jsonl-reference.md`)
- Implemented `@claude-archive/parser` package with Zod schemas
- Validated parser against real data (27 projects, 0 parse errors)
- Discovered and added `compact_boundary` system subtype

**Decision: PostgreSQL + JSONB** for central database (self-hosted on Hetzner)

---

## Next Steps

### ~~Step 1: Server Package (`packages/server`)~~ DONE

- [x] Database migrations (Drizzle ORM)
- [x] Connect to PostgreSQL on `minix-k3s`
- [x] Create `claude_archive` schema
- [x] Implement all 10 tables from `docs/db-schema.md`
- [x] Hono API routes with OpenAPI
- [x] Collector sync endpoints
- [x] Project/Session/Entry read endpoints
- [x] Unit tests

### ~~Step 2: Collector Package (`packages/collector`)~~ DONE

- [x] Git repo discovery (configurable search paths)
- [x] Claude workspace discovery (`~/.claude/projects`)
- [x] Idempotent, incremental sync
- [x] Branch tracking with ahead/behind counts
- [x] Dirty working directory snapshots
- [x] Tool results synchronization

### Step 3: Runner Package (`packages/runner`)

Headless Claude Code session control:

- [ ] Session resume via `claude --print` or similar
- [ ] WebSocket output streaming
- [ ] API integration for UI control

### Step 4: Web UI (`packages/web`)

NextJS dashboard:

- [ ] Project/session browser
- [ ] Timeline visualization
- [ ] Search and analysis
- [ ] Runner integration (resume sessions)

---

## Development Environment

**PostgreSQL:**
- Host: `minix-k3s` via LoadBalancer (192.168.178.202:5432)
- Database: `hiddenstories_development`
- Schema: `claude_archive`
- User: `claude_archive`

```bash
# Connect directly
PGPASSWORD=claude_archive_dev_pass psql -h 192.168.178.202 -U claude_archive -d hiddenstories_development

# Run server
cd packages/server
pnpm dev

# API docs
http://localhost:4001/api/docs
```

---

## Open Questions

- Runner: Exact Claude Code CLI flags for headless/non-interactive mode?
