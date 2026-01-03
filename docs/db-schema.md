# Database Schema

> 8 Tabellen: Project, GitRepo, GitBranch, GitCommit, Workspace, Session, Entry, ToolResult

## Übersicht

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Project                                     │
│                    (Zentrales Entity: Git UND/ODER Claude)               │
└─────────────────────────────────────────────────────────────────────────┘
        │
        ├─────────────────────┬─────────────────────┐
        │ 1                   │ 1                   │ 1
        ▼ n                   ▼ n                   ▼ n
┌─────────────────┐    ┌─────────────┐      ┌─────────────┐
│     GitRepo     │    │  GitCommit  │      │  Workspace  │
│   (Checkouts)   │    │ (Historie)  │      │(Claude-Proj)│
└─────────────────┘    └─────────────┘      └─────────────┘
        │                                          │
        │ 1                                        │ 1
        ▼ n                                        ▼ n
┌─────────────────┐                         ┌─────────────┐
│   GitBranch     │                         │   Session   │◄──┐
│ (per Checkout)  │                         └─────────────┘   │
└─────────────────┘                                │          │
                                                   │ 1        │ parent_session_id
        GitRepo ─────────────────────────────────► │          │ (Agent → Parent)
                      git_repo_id (optional)       ▼ n        │
                                            ┌─────────────┐   │
                                            │    Entry    │───┘
                                            └─────────────┘
                                                   │
                                                   │ 1
                                                   ▼ n
                                            ┌─────────────┐
                                            │ ToolResult  │
                                            └─────────────┘
```

**8 Tabellen:** Project, GitRepo, GitBranch, GitCommit, Workspace, Session, Entry, ToolResult

---

## Tabellen

### Project

Zentrales Entity. Repräsentiert ein logisches Projekt - unabhängig davon, ob es Claude-Sessions hat oder nur als Git-Repo existiert.

| Column | Type | Constraints | Beschreibung |
|--------|------|-------------|--------------|
| id | UUID | PK | |
| name | TEXT | NOT NULL | Display-Name (aus Repo-Name oder Verzeichnis) |
| upstream_url | TEXT | UNIQUE, NULL | GitHub/GitLab URL (wenn gepusht) |
| description | TEXT | NULL | Optional: README-Auszug oder manuell |
| created_at | TIMESTAMP | NOT NULL | Erster Fund (Git oder Claude) |
| updated_at | TIMESTAMP | NOT NULL | Letzter Fund/Sync |
| archived | BOOLEAN | DEFAULT false | Manuell archiviert |

**Projekt-Identifikation (Priorität):**
1. `upstream_url` vorhanden → Gruppiere nach URL
2. Nur lokales Git → Eigenes Project pro `GitRepo.path + host`
3. Nur Claude (kein Git) → Eigenes Project pro `Workspace.cwd + host`

**upstream_url Normalisierung:**
```typescript
// Alle Formate auf einheitliche Form bringen
function normalizeUpstreamUrl(url: string): string {
  // git@github.com:user/repo.git → github.com/user/repo
  // https://github.com/user/repo.git → github.com/user/repo
  // https://github.com/user/repo → github.com/user/repo

  let normalized = url
    .replace(/^git@([^:]+):/, '$1/')  // git@ zu path
    .replace(/^https?:\/\//, '')       // Protokoll entfernen
    .replace(/\.git$/, '')             // .git suffix entfernen
    .toLowerCase();                    // Case-insensitive

  return normalized;
}
```

---

### GitRepo

Physische Git-Checkouts auf verschiedenen Hosts. Ein Project kann mehrere Checkouts haben.

| Column | Type | Constraints | Beschreibung |
|--------|------|-------------|--------------|
| id | UUID | PK | |
| project_id | UUID | FK → Project | |
| host | TEXT | NOT NULL | Hostname des Rechners |
| path | TEXT | NOT NULL | Absoluter Pfad zum Git-Root |
| default_branch | TEXT | NULL | main/master/etc. |
| current_branch | TEXT | NULL | Aktuell ausgecheckter Branch |
| head_sha | TEXT | NULL | Aktueller HEAD Commit |
| is_dirty | BOOLEAN | DEFAULT false | Uncommitted Changes vorhanden |
| dirty_files_count | INTEGER | NULL | Anzahl geänderter Dateien |
| dirty_snapshot | JSONB | NULL | `git status --porcelain` + Metadaten |
| last_file_change_at | TIMESTAMP | NULL | Neueste mtime einer dirty Datei |
| last_scanned_at | TIMESTAMP | NULL | Letzter Collector-Scan |
| created_at | TIMESTAMP | NOT NULL | |

**Unique:** `(host, path)`

**dirty_snapshot Format:**
```json
{
  "status": "M  src/index.ts\n?? temp.txt",
  "files": [
    { "path": "src/index.ts", "status": "M", "mtime": "2026-01-03T12:00:00Z" },
    { "path": "temp.txt", "status": "??", "mtime": "2026-01-03T11:30:00Z" }
  ],
  "captured_at": "2026-01-03T12:05:00Z"
}
```

**Herkunft:**
- Collector scannt konfigurierte Suchpfade (z.B. `~/src`, `~/projects`)
- Findet alle `.git` Verzeichnisse
- Extrahiert `origin` Remote → `upstream_url` für Project-Matching

---

### GitBranch

Branches pro GitRepo (nicht projekt-weit). Ermöglicht Tracking von lokalen, unpushed Branches.

| Column | Type | Constraints | Beschreibung |
|--------|------|-------------|--------------|
| id | UUID | PK | |
| git_repo_id | UUID | FK → GitRepo | |
| name | TEXT | NOT NULL | Branch-Name (z.B. `main`, `feature/x`) |
| head_sha | TEXT | NOT NULL | Aktueller HEAD des Branches |
| upstream_name | TEXT | NULL | Remote-Tracking Branch (z.B. `origin/main`) |
| upstream_sha | TEXT | NULL | SHA des Upstream-Branches |
| ahead_count | INTEGER | DEFAULT 0 | Commits ahead of upstream |
| behind_count | INTEGER | DEFAULT 0 | Commits behind upstream |
| last_commit_at | TIMESTAMP | NULL | Timestamp des HEAD Commits |
| discovered_at | TIMESTAMP | NOT NULL | Erster Fund |
| last_seen_at | TIMESTAMP | NOT NULL | Letzter Scan wo Branch existierte |
| force_push_count | INTEGER | DEFAULT 0 | Anzahl erkannter Force-Pushes |
| last_force_push_at | TIMESTAMP | NULL | Letzter Force-Push |

**Unique:** `(git_repo_id, name)`

**Computed:** `is_pushed = (ahead_count == 0 AND upstream_sha IS NOT NULL)`

**Hinweis:** Branches sind pro GitRepo, nicht projekt-weit. Bei der Anzeige nach `name` gruppieren für projekt-weite Sicht. Lokale Branches (ohne upstream) haben `upstream_name = NULL`.

**Force-Push Erkennung:** Wenn `head_sha` sich ändert und der neue HEAD kein Nachfolger des alten ist (parent-Traversal), wird `force_push_count` inkrementiert.

---

### GitCommit

Komplette Git-Historie aller Projekte.

| Column | Type | Constraints | Beschreibung |
|--------|------|-------------|--------------|
| id | UUID | PK | |
| project_id | UUID | FK → Project | |
| sha | TEXT | NOT NULL | Commit SHA |
| message | TEXT | NOT NULL | Commit Message |
| author_name | TEXT | NOT NULL | |
| author_email | TEXT | NOT NULL | |
| author_date | TIMESTAMP | NOT NULL | |
| committer_name | TEXT | NULL | |
| committer_date | TIMESTAMP | NULL | |
| parent_shas | TEXT[] | NULL | Parent Commit SHAs |

**Unique:** `(project_id, sha)`

**Hinweis:** Branch-Zugehörigkeit wird über GitBranch.head_sha + parent-Traversal ermittelt, nicht gespeichert (würde sich bei jedem Push ändern).

**Zuordnung zu Claude-Sessions:**
- Dynamisch via Timestamp-Range der Session
- Session.first_entry_at ≤ author_date ≤ Session.last_entry_at
- Optional: Gleicher Branch (`Entry.gitBranch`)

---

### Workspace

Claude Code Projekt-Verzeichnisse. Entspricht `~/.claude/projects/{encoded-path}/`.

| Column | Type | Constraints | Beschreibung |
|--------|------|-------------|--------------|
| id | UUID | PK | |
| project_id | UUID | FK → Project | |
| host | TEXT | NOT NULL | Hostname des Rechners |
| cwd | TEXT | NOT NULL | Working Directory (absolut) |
| claude_project_path | TEXT | NOT NULL | Pfad unter `~/.claude/projects/` |
| git_repo_id | UUID | FK → GitRepo, NULL | Zugehöriges Git-Repo (wenn vorhanden) |
| first_seen_at | TIMESTAMP | NOT NULL | Erster Sync |
| last_synced_at | TIMESTAMP | NOT NULL | Letzter Sync |

**Unique:** `(host, cwd)`

**Hinweis:** `cwd` kann ein Subdir des Git-Repos sein (Monorepo-Fall).

---

### Session

Claude Code Sessions (Haupt-Sessions und Agent-Sessions).

| Column | Type | Constraints | Beschreibung |
|--------|------|-------------|--------------|
| id | UUID | PK | Generierte ID |
| workspace_id | UUID | FK → Workspace | |
| original_session_id | TEXT | NOT NULL | sessionId aus JSONL |
| parent_session_id | UUID | FK → Session, NULL | NULL = Haupt-Session, SET = Agent |
| agent_id | TEXT | NULL | 7-char Hex bei Agents |
| filename | TEXT | NOT NULL | Originaler Dateiname |
| first_entry_at | TIMESTAMP | NULL | Timestamp des ersten Entry |
| last_entry_at | TIMESTAMP | NULL | Timestamp des letzten Entry |
| entry_count | INTEGER | DEFAULT 0 | Anzahl Entries |
| summary | TEXT | NULL | Summary-Entry Text (wenn vorhanden) |
| models_used | TEXT[] | NULL | Verwendete Modelle |
| total_input_tokens | INTEGER | DEFAULT 0 | Aggregiert |
| total_output_tokens | INTEGER | DEFAULT 0 | Aggregiert |
| synced_at | TIMESTAMP | NOT NULL | Letzter Sync |

**Computed:** `is_agent = (agent_id IS NOT NULL)`

**Session-Typen:**

| Datei | agent_id | parent_session_id |
|-------|----------|-------------------|
| `{uuid}.jsonl` | NULL | NULL |
| `agent-{hex}.jsonl` | "a56fb9a" | FK → Parent |

---

### Entry

Einzelne JSONL-Einträge. JSONB für flexible Speicherung, extrahierte Felder für Indizierung.

| Column | Type | Constraints | Beschreibung |
|--------|------|-------------|--------------|
| id | UUID | PK | Generierte ID |
| session_id | UUID | FK → Session | |
| original_uuid | UUID | NULL | UUID aus JSONL (nicht alle Entries haben eins) |
| line_number | INTEGER | NOT NULL | Position in JSONL-Datei |
| type | TEXT | NOT NULL | user\|assistant\|summary\|system\|... |
| subtype | TEXT | NULL | Für system: stop_hook_summary, etc. |
| timestamp | TIMESTAMP | NULL | Entry Timestamp (nicht alle haben eins) |
| data | JSONB | NOT NULL | Kompletter Entry als JSON |

**Indizes:**
- `(session_id, line_number)` - Reihenfolge
- `(session_id, type)` - Filterung
- `(timestamp)` - Zeitliche Suche
- `data` - GIN Index für JSONB-Suche

**Hinweis:** Weitere Felder (model, tokens, git_branch, etc.) bleiben in `data`. Nur für Queries kritische Felder werden extrahiert. Das JSONL-Format bleibt in `data` vollständig erhalten.

---

### ToolResult

Große Tool-Outputs (Screenshots, lange Texte). Entspricht den `tool-results/` Dateien.

| Column | Type | Constraints | Beschreibung |
|--------|------|-------------|--------------|
| id | UUID | PK | |
| entry_id | UUID | FK → Entry | User-Entry mit tool_result |
| tool_use_id | TEXT | NOT NULL | Tool-Use ID (z.B. `toolu_01ABC...`) |
| tool_name | TEXT | NOT NULL | Read, Bash, WebFetch, etc. |
| content_type | TEXT | NOT NULL | MIME-Type |
| content_text | TEXT | NULL | Text-Inhalt (wenn text/*) |
| content_binary | BYTEA | NULL | Binär-Inhalt (wenn image/*, etc.) |
| size_bytes | INTEGER | NOT NULL | Größe in Bytes |
| is_error | BOOLEAN | DEFAULT false | Tool-Fehler |
| created_at | TIMESTAMP | NOT NULL | |

**Unique:** `(entry_id, tool_use_id)`

**Zuordnung:**
- `entry_id` → User-Entry (type="user") das die `tool_result` enthält
- `tool_use_id` verknüpft zurück zum vorherigen Assistant-Entry mit `tool_use`

**Content-Types:**
- `text/plain` - Bash-Output, File-Content → `content_text`
- `image/png`, `image/jpeg` - Screenshots → `content_binary`
- `application/json` - Strukturierte Outputs → `content_text`

**Hinweis:** Nur Outputs aus `tool-results/` Ordner werden hier gespeichert. Claude Code entscheidet bereits, was "zu groß" ist.

---

## Beziehungen

```
Project    1 ──── n  GitRepo          "Checkouts auf verschiedenen Hosts"
Project    1 ──── n  GitCommit        "Komplette Git-Historie"
Project    1 ──── n  Workspace        "Claude-Projekte auf verschiedenen Hosts"
GitRepo    1 ──── n  GitBranch        "Branches pro Checkout"
GitRepo    1 ──── n  Workspace        "Workspace kann in GitRepo liegen (optional)"
Workspace  1 ──── n  Session          "Sessions pro Workspace"
Session    1 ──── n  Session          "Haupt → Agents (self-ref)"
Session    1 ──── n  Entry            "Entries pro Session"
Entry      1 ──── n  ToolResult       "Große Tool-Outputs"
```

---

## Projekt-Szenarien

### Szenario 1: GitHub-Projekt mit Claude auf 2 Rechnern

```
Project (upstream_url: github.com/user/repo)
├── GitRepo (host: desktop, path: ~/src/repo)
├── GitRepo (host: laptop, path: ~/projects/repo)
├── GitCommit[] (komplette Historie)
├── Workspace (host: desktop, cwd: ~/src/repo)
│   └── Session[] → Entry[]
└── Workspace (host: laptop, cwd: ~/projects/repo)
    └── Session[] → Entry[]
```

### Szenario 2: Lokales Git-Repo ohne Remote

```
Project (upstream_url: NULL, name: "local-experiment")
├── GitRepo (host: desktop, path: ~/src/experiment)
├── GitCommit[] (lokale Historie)
└── Workspace (host: desktop, cwd: ~/src/experiment)
    └── Session[] → Entry[]
```

### Szenario 3: Projekt ohne Git

```
Project (upstream_url: NULL, name: "scripts")
└── Workspace (host: desktop, cwd: ~/scripts)
    └── Session[] → Entry[]
```

### Szenario 4: Git-Repo ohne Claude-Sessions

```
Project (upstream_url: github.com/user/old-repo)
├── GitRepo (host: desktop, path: ~/src/old-repo)
└── GitCommit[] (Historie)
(keine Workspaces - Claude-Sessions bereits gelöscht oder nie vorhanden)
```

### Szenario 5: Monorepo mit mehreren Claude-Workspaces

```
Project (upstream_url: github.com/org/monorepo)
├── GitRepo (host: desktop, path: ~/src/monorepo)
├── GitCommit[]
├── Workspace (host: desktop, cwd: ~/src/monorepo)           # Root
├── Workspace (host: desktop, cwd: ~/src/monorepo/apps/web)  # Subdir
└── Workspace (host: desktop, cwd: ~/src/monorepo/packages/core)
```

---

## Collector-Verhalten

### Git-Repo Discovery

```yaml
# Collector Config
git_search_paths:
  - ~/src
  - ~/projects
  - ~/work
git_ignore_patterns:
  - "**/node_modules/**"
  - "**/vendor/**"
```

1. Rekursiv `.git` Verzeichnisse finden
2. `git remote get-url origin` → `upstream_url`
3. Project matchen oder erstellen
4. GitRepo erstellen/updaten
5. Commits synchronisieren

### Claude-Workspace Discovery

1. `~/.claude/projects/` scannen
2. CWD aus Pfad dekodieren (`-home-user-src-` → `/home/user/src/`)
3. Prüfen ob CWD in bekanntem GitRepo liegt
4. Project matchen (via GitRepo oder eigenes)
5. Sessions und Entries synchronisieren

---

## Sync-Strategie

### Grundprinzipien

- **Idempotent**: Collector kann beliebig oft laufen ohne Duplikate/Inkonsistenzen
- **Inkrementell**: Nur Änderungen seit letztem Scan synchronisieren
- **Append-Only Optimierung**: Git-Commits und Claude-Entries sind weitgehend append-only

### Git-Sync

```
1. Für jedes GitRepo:
   a. git fetch --all (neue Commits holen)
   b. Neue Commits seit last_scanned_at einfügen
   c. Branches aktualisieren (ahead/behind counts)
   d. Working-Directory Status erfassen (dirty_snapshot)
   e. last_scanned_at updaten

2. Sonderfall Rebase:
   - Commits mit gleichem SHA existieren bereits → Skip
   - Commits mit neuem SHA aber ähnlicher Message → Neue Commits (Historie ändert sich)
   - Alte Commits bleiben erhalten (historische Referenz)
```

### Claude-Session-Sync

```
1. Für jeden Workspace:
   a. JSONL-Dateien scannen
   b. Für jede Datei: mtime prüfen
   c. Wenn mtime > synced_at:
      - Neue Zeilen seit letzter line_number lesen
      - Entries einfügen
      - Session-Aggregates updaten (token counts, etc.)
   d. Neue Sessions erstellen wenn Datei unbekannt
```

### Sync-Frequenz

| Daten | Empfohlene Frequenz | Grund |
|-------|---------------------|-------|
| Git Working-Dir Status | 1-5 min | Aktive Arbeit tracken |
| Git Commits | 5-15 min | Neue Commits erfassen |
| Claude Sessions | 1-5 min | Aktive Sessions tracken |
| Git Branches | 15-60 min | Seltenere Änderungen |

---

## Entscheidungen

| Frage | Entscheidung |
|-------|--------------|
| Commit-Sync | Inkrementell, idempotent |
| Branch-Tracking | Ja, pro GitRepo, alle Branches mit ahead/behind |
| Uncommitted Changes | Ja, mit dirty_snapshot + mtime |
| Gelöschte Sessions | Nicht tracken |
| File-History-Snapshots | In JSONB (Entry.data) belassen |
| Tool-Results | Separate Tabelle, nur für `tool-results/` Ordner |
| Entry JSONL-Format | In `data` vollständig erhalten, minimale Extraktion |
| Redundante Felder | `is_agent`, `is_pushed` als Computed, nicht gespeichert |
| IDs | Eigene UUIDs generieren, Original-IDs separat speichern |
| upstream_url | Bei Insert normalisieren (Protokoll, .git entfernen) |

---

## Weitere Entscheidungen

### Rebase-Erkennung

Rebase/Force-Push wird erkannt via:
1. `GitBranch.head_sha` ändert sich
2. Neuer HEAD ist kein Nachfolger des alten HEAD (parent-Traversal)
3. → `force_push_count` inkrementieren, `last_force_push_at` setzen

Felder bereits in `GitBranch` Tabelle definiert.

### Stale Branches

Branch gilt als "stale" wenn `last_commit_at` älter als konfigurierter Threshold.

```typescript
// Runtime-Konfiguration
interface CollectorConfig {
  staleBranchDays: number;  // Default: 30
  // ...
}
```

UI kann stale Branches filtern/ausblenden.

### ToolResult Threshold

Kein eigener Threshold nötig. Claude Code entscheidet bereits:
- Datei in `tool-results/{tool_use_id}.json` vorhanden → in ToolResult speichern
- Nicht vorhanden → bleibt inline in Entry.data (JSONB)

Wir folgen einfach Claude Codes Entscheidung.
