# Project Status

## History

### 2026-01-03 14:30 - Database Schema Design

- Designed 8-table PostgreSQL schema (`docs/db-schema.md`)
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

### Step 1: Server Package (`packages/server`)

Create API server with PostgreSQL backend:

- [ ] Database migrations (Drizzle ORM)
- [ ] Connect to PostgreSQL on `minix-k8s` (Tailscale, namespace `development`)
- [ ] Create `claude_archive` schema
- [ ] Implement all 8 tables from `docs/db-schema.md`
- [ ] Hono API routes
- [ ] Endpoints: projects, sessions, entries, search
- [ ] Git metadata endpoints

### Step 2: Collector Package (`packages/collector`)

Sync daemon for each host:

- [ ] Git repo discovery (configurable search paths)
- [ ] Claude workspace discovery (`~/.claude/projects`)
- [ ] Idempotent, incremental sync
- [ ] Branch tracking with ahead/behind counts
- [ ] Dirty working directory snapshots
- [ ] Force-push detection

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
- Host: `minix-k8s` (Tailscale)
- Namespace: `development`
- Credentials: via `kubectl get secret`

```bash
# Check postgres pod
kubectl get pods -n development

# Get credentials
kubectl get secret -n development postgres-credentials -o jsonpath='{.data.password}' | base64 -d
```

---

## Open Questions

- Runner: Exact Claude Code CLI flags for headless/non-interactive mode?
