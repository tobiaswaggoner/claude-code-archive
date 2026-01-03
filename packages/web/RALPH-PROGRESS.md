# Ralph Wiggum Progress

## MVP Status: 2/4 complete

### MVP Checklist:
- [x] Navigation & Layout - DONE (Sidebar with sections: Archive, Git, System)
- [x] Projektliste (mit Filterung) - DONE (Table with search, 173 projects loaded)
- [ ] Konversations-Viewer - IN PROGRESS
- [ ] Zeitliche Übersicht - TODO

## Current Iteration: 1
Working on: Session/Conversation Viewer
Status: In Progress

## Completed Features:
1. Navigation & Layout - Iteration 1 - Sidebar navigation with sections, theme toggle, user menu
2. Projects List - Iteration 1 - Table view with search, session/repo/workspace counts, relative time, GitHub links

## Next Up:
1. Sessions page (list all sessions)
2. Session detail page with entries viewer
3. Markdown rendering for assistant messages
4. Activity timeline/heatmap

## Decisions Made:
- Using BetterAuth for authentication (NEXT_PUBLIC_AUTH_MODE=backend)
- Backend runs on port 4001, Frontend on port 4005
- Session-based auth via cookies for web UI (credentials: "include")
- API keys are per-user (stored in auth_user.api_key column)
- TanStack Query for server state management

## Server Configuration

### Backend (.env)
```
PORT=4001
API_KEY=dev-api-key-change-in-production  # Legacy, not used for web UI
BETTER_AUTH_SECRET=eVaNwYVV6zuGBACchwTpxcUWeBWUUHQhwB03JrAMTew=
DATABASE_URL=postgresql://claude_archive:claude_archive_dev_pass@192.168.178.202:5432/hiddenstories_development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_ARCHIVE_SERVER_URL=http://localhost:4001
NEXT_PUBLIC_AUTH_MODE=backend
```

### Starting Servers
```bash
# Backend (port 4001)
cd packages/server && pnpm dev

# Frontend (port 4005)
cd packages/web && pnpm dev
```

## Database Info
- PostgreSQL on minix-k3s (192.168.178.202)
- Schema: claude_archive
- Database: hiddenstories_development
- User: claude_archive / claude_archive_dev_pass

### Test Users in DB:
| Name | Email | API Key |
|------|-------|---------|
| System | system@claude-archive.local | ca_753ee75bde15dccc3b53bc0c8e974bb8 |
| Admin | admin@claude-archive.local | (none) |
| Test User | test2@example.com | (none) |

### Test API call:
```bash
curl -s http://localhost:4001/api/projects \
  -H "X-API-Key: ca_753ee75bde15dccc3b53bc0c8e974bb8" | jq
```

## Technical Notes:
- 173 projects in database
- OpenAPI spec: http://localhost:4001/api/openapi.json
- API Docs UI: http://localhost:4001/api/docs
- Key endpoints:
  - GET /api/projects - List projects (search, archived, limit, offset)
  - GET /api/projects/{id} - Project detail
  - GET /api/projects/{id}/workspaces - Project workspaces
  - GET /api/sessions - List sessions (projectId, workspaceId, mainOnly)
  - GET /api/sessions/{id} - Session with agents
  - GET /api/sessions/{id}/entries - Session entries (type, limit, offset)

## Architecture:
- Feature slices in src/features/
- DI Container for testability
- Services registered in providers.tsx
- ApiClient uses session cookies (credentials: include)

## Known Issues:
- Need to register user via BetterAuth signUp for session auth to work
- Mock auth mode available as fallback (NEXT_PUBLIC_AUTH_MODE=mock)
