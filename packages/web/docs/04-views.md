# Views & Pages

## Routing Struktur

```
/                       → Dashboard (redirect zu /projects wenn kein Dashboard gewünscht)
/projects               → Project Liste
/projects/[id]          → Project Detail (Tabs: Sessions, Git, Workspaces)
/sessions               → Session Liste (alle)
/sessions/[id]          → Session Viewer (Conversation + Entries)
/repos                  → Git Repository Liste
/repos/[id]             → Repo Detail (Branches, Commits)
/commits                → Commit Timeline (global)
/collectors             → Collector Übersicht
/collectors/[id]        → Collector Detail (Logs, Status)
/settings               → App Settings
/login                  → Login Page
```

---

## /projects - Project Liste

### Header

```
Projects                                    [+ New Project] [Search]
```

### Filter Bar

```
[Project Type ▼] [Has Git ▼] [Last Active ▼] [Show Archived]  [Clear]
```

### Tabelle

| Column | Width | Sortable | Beschreibung |
|--------|-------|----------|--------------|
| Name | 30% | ✓ | Project Name + upstream_url Badge |
| Sessions | 100px | ✓ | Anzahl |
| Git Repos | 100px | ✓ | Anzahl |
| Last Active | 150px | ✓ | RelativeTime |
| Tokens | 150px | ✓ | Total In/Out |
| Actions | 60px | | [...] Menu |

### Row Expansion

Click auf Row → Navigate zu `/projects/[id]`

### API

```
GET /api/projects?limit=50&offset=0&search=...&archived=false
```

---

## /projects/[id] - Project Detail

### Header

```
← Projects / claude-code-archive                      [Archive] [Settings]
```

### Overview Section

```
+------------------------------------------------------------------+
| Project: claude-code-archive                                      |
| github.com/user/claude-code-archive                         [↗]  |
+------------------------------------------------------------------+
| Sessions: 45  |  Git Repos: 2  |  Total Tokens: 1.2M in / 3.4M out |
+------------------------------------------------------------------+
```

### Tabs

#### Sessions Tab

Liste der Sessions für dieses Projekt:

```
[Main Only ○] [Date Range] [Model Filter]

+--------------------------------------------------------------+
| Summary / First Message                     Time    Tokens   |
+--------------------------------------------------------------+
| Implementing user authentication...         2h ago  12K/34K  |
| Bug fix for API validation                  1d ago   8K/22K  |
| ...                                                          |
+--------------------------------------------------------------+
```

#### Git Tab

```
Repositories (2)
+----------------------------------------------+
| desktop-wsl: ~/src/claude-code-archive       |
| Branch: main ↑3 | Dirty: 2 files | 2h ago    |
+----------------------------------------------+
| laptop: ~/projects/claude-code-archive       |
| Branch: feature/ui | Clean | 1d ago          |
+----------------------------------------------+

Recent Commits
+----------------------------------------------+
| abc1234 | feat: Add user auth | 2h ago       |
| def5678 | fix: API validation | 3h ago       |
| ...                                          |
+----------------------------------------------+
```

#### Workspaces Tab

```
+----------------------------------------------+
| Host           | CWD                  | Sessions |
+----------------------------------------------+
| desktop-wsl    | ~/src/repo           | 32       |
| laptop         | ~/projects/repo      | 13       |
+----------------------------------------------+
```

### API

```
GET /api/projects/[id]
GET /api/projects/[id]/workspaces
GET /api/projects/[id]/git-repos
GET /api/sessions?projectId=[id]
```

---

## /sessions - Session Liste

### Layout

Master-Detail (ab 1024px):

```
+---------------------------+--------------------------------+
|     SESSION LIST          |        SESSION VIEWER          |
| [Filter Bar]              | (wenn Session ausgewählt)      |
| +---------------------+   |                                |
| | Session 1           |   |                                |
| | Session 2 [sel]     |   |                                |
| | Session 3           |   |                                |
| +---------------------+   |                                |
+---------------------------+--------------------------------+
```

### Filter Bar

```
[Project ▼] [Date Range] [Model ▼] [Main Only ○]
```

### List Item

```
+--------------------------------------------------+
| Implementing user authentication...              |
| claude-code-archive • 2h ago • 12K/34K • 3 agents|
+--------------------------------------------------+
```

### API

```
GET /api/sessions?limit=50&offset=0&projectId=...&mainOnly=true
```

---

## /sessions/[id] - Session Viewer

### Header

```
← Sessions / abc123...                    [Copy ID] [Export] [Delete]
```

### Metadata Panel (collapsible)

```
+------------------------------------------------------------------+
| Project: claude-code-archive          | Duration: 2h 15m          |
| Workspace: desktop-wsl:~/src/repo     | Entries: 156              |
| Started: Jan 3, 2026 14:32            | Tokens: 45K in / 123K out |
| Models: Claude Opus 4.5, Claude Sonnet 4                          |
+------------------------------------------------------------------+
```

### Agent Sessions (wenn vorhanden)

```
Agent Sessions (3)
+------------------------------------------------------------------+
| a56fb9a | Explore: codebase structure      | 234 entries | 12K   |
| b78cd3e | Plan: implementation             | 89 entries  | 8K    |
| c90ef1g | general-purpose: research        | 156 entries | 22K   |
+------------------------------------------------------------------+
```

### Conversation View

```
+------------------------------------------------------------------+
| [User]                                                   14:32:15 |
| Hilf mir beim Implementieren von User Auth                        |
+------------------------------------------------------------------+
| [Assistant]                                              14:32:45 |
| Ich werde dir dabei helfen...                                     |
|                                                                   |
| ┌──────────────────────────────────────────┐                      |
| │ [Read] packages/server/src/routes/...     │                      |
| │ > Click to expand                         │                      |
| └──────────────────────────────────────────┘                      |
+------------------------------------------------------------------+
```

### Entry Detail Sidebar (optional)

Bei Click auf Entry → Raw JSON anzeigen:

```
+------------------+
| Entry Details    |
| Type: assistant  |
| UUID: abc123...  |
| Line: 45         |
+------------------+
| Raw JSON         |
| {                |
|   "type": ...    |
| }                |
+------------------+
```

### API

```
GET /api/sessions/[id]
GET /api/sessions/[id]/entries?limit=100&offset=0
```

---

## /repos - Git Repository Liste

### Tabelle

| Column | Width | Sortable |
|--------|-------|----------|
| Repository | 30% | ✓ |
| Host | 150px | ✓ |
| Branch | 150px | |
| Status | 100px | |
| Last Scanned | 150px | ✓ |

### Status Badges

- `Clean` - Grün
- `Dirty (5)` - Orange mit Count
- `Behind` - Rot

### API

```
GET /api/git-repos (TODO: implementieren)
```

---

## /commits - Commit Timeline

### Layout

Vertikale Timeline:

```
January 3, 2026
├── 14:32 feat: Add user auth (claude-code-archive) [main]
├── 13:15 fix: Validation bug (claude-code-archive) [main]
└── 10:00 chore: Update deps (xrai-website) [develop]

January 2, 2026
├── ...
```

### Filter

```
[Project ▼] [Author ▼] [Branch ▼] [Date Range]
```

### API

```
GET /api/commits (TODO: implementieren)
```

---

## /collectors - Collector Übersicht

### Cards

```
+---------------------------+  +---------------------------+
| desktop-wsl               |  | laptop                    |
| Ubuntu 22.04 WSL2         |  | macOS 14.1                |
| Last seen: 5 min ago      |  | Last seen: 2 days ago     |
| Status: ● Active          |  | Status: ○ Inactive        |
| Last Sync: Success        |  | Last Sync: Error          |
+---------------------------+  +---------------------------+
```

### API

```
GET /api/collectors
```

---

## /collectors/[id] - Collector Detail

### Overview

```
+------------------------------------------------------------------+
| desktop-wsl                                         ● Active      |
| Hostname: DESKTOP-ABC123                                          |
| OS: Ubuntu 22.04 WSL2                                             |
| Version: 1.0.0                                                    |
| Registered: Jan 1, 2026                                           |
| Last Seen: 5 minutes ago                                          |
+------------------------------------------------------------------+
```

### Config

```json
{
  "search_paths": ["~/src", "~/projects"],
  "ignore_patterns": ["node_modules"]
}
```

### Run Logs

```
[Date Filter] [Level Filter: Error/Warn/Info/Debug]

+------------------------------------------------------------------+
| 2026-01-03 14:32:15 | INFO  | Sync started                       |
| 2026-01-03 14:32:16 | INFO  | Found 12 sessions                  |
| 2026-01-03 14:32:45 | INFO  | Sync completed (156 entries)       |
+------------------------------------------------------------------+
```

### API

```
GET /api/collectors/[id]
GET /api/collectors/[id]/logs
```

---

## /settings - App Settings

### Sections

#### Theme

```
Theme: [Light] [Dark] [System]
```

#### API Configuration

```
Server URL: https://archive.example.com  [Test Connection]
API Key: ••••••••••••  [Reveal] [Copy]
```

#### Data

```
[Clear Local Cache]  [Export All Data]
```

---

## /login - Login Page

### Layout

Zentriert, minimalistisch:

```
+------------------------------------------+
|                                          |
|        [Logo]                            |
|        Claude Code Archive               |
|                                          |
|  +----------------------------------+    |
|  | Email                            |    |
|  +----------------------------------+    |
|  | Password                         |    |
|  +----------------------------------+    |
|  | [Sign In]                        |    |
|  +----------------------------------+    |
|                                          |
+------------------------------------------+
```

### Error States

- Invalid credentials → Red border + message
- Server error → Toast notification

---

## Error Pages

### 404

```
+------------------------------------------+
|        [404]                             |
|        Page not found                    |
|        [Go to Dashboard]                 |
+------------------------------------------+
```

### 500

```
+------------------------------------------+
|        [Error Icon]                      |
|        Something went wrong              |
|        Please try again later            |
|        [Reload Page]                     |
+------------------------------------------+
```

---

## Data Fetching Strategy

### Pattern

- **Server Components** für initial data
- **React Query** für client-side updates
- **Optimistic Updates** für lokale Actions

### Caching

```tsx
// Example: Sessions List
const { data, isLoading } = useQuery({
  queryKey: ["sessions", { projectId, page }],
  queryFn: () => fetchSessions({ projectId, page }),
  staleTime: 30_000, // 30s
});
```

### Prefetching

- Hover über List Item → Prefetch Detail
- Navigation → Prefetch nächste Seite
