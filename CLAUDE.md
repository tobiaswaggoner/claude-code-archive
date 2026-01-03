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

## Database

PostgreSQL with JSONB. Connection via environment:

```
DATABASE_URL=postgresql://user:pass@host:5432/claude_archive
```

## Development

```bash
pnpm install
pnpm build        # Build all packages
pnpm -r dev       # Watch mode
```
