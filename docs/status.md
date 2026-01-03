# Project Status

## History

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

Create API server with configurable PostgreSQL connection:

- [ ] Database schema design (sessions, entries, projects, sources)
- [ ] Prisma/Drizzle ORM setup with env-based config
- [ ] Hono/Fastify API routes
- [ ] Endpoints: projects, sessions, entries, search
- [ ] Git metadata storage

### Step 2: Collector Package (`packages/collector`)

Sync tool that runs on each host:

- [ ] File watcher for `~/.claude/projects`
- [ ] Idempotent sync to PostgreSQL
- [ ] Source (hostname) tagging
- [ ] Git repo detection and metadata extraction
- [ ] Scheduler/daemon mode

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

## Open Questions

- Git commit history: Store in separate table or embed in session metadata?
- Runner: Exact Claude Code CLI flags for headless/non-interactive mode?
