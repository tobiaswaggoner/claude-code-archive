# Ralph Wiggum: Autonome UI-Entwicklung für Claude Code Archive

## Projektkontext

Du entwickelst das Frontend für **Claude Code Archive** - ein System zur Synchronisation und Analyse von Claude Code Konversationen und Git-Repositories über mehrere Rechner hinweg.

**Was existiert:**
- PostgreSQL-Datenbank mit synchronisierten Daten (Schema fix, keine Änderungen)
- Hono API-Server mit OpenAPI-Dokumentation (`/api/docs`)
- Next.js 16 Projekt mit Better Auth (Login funktioniert)
- Collector CLI synchronisiert Daten von verschiedenen Hosts

**Datenmodell (lies die API-Docs für Details):**
- `projects` - Claude Code Projekte (mit Pfad, Name)
- `sessions` - Konversations-Sessions pro Projekt
- `session_entries` - Einzelne Nachrichten/Tool-Calls in einer Session
- `git_repositories` - Synchronisierte Git-Repos
- `git_commits` - Commit-Historie
- `collectors` - Registrierte Sync-Clients (Hosts)

---

## Nutzerziele

Der Nutzer hat über 200 Repositories auf 4-5 Geräten und hat den Überblick verloren. Er möchte:

1. **Wissen, wann er an was gearbeitet hat** - zeitliche Übersicht über Projekte
2. **Konversationen mit Claude Code lesen** - gut formatiert, navigierbar
3. **Projekte suchen und filtern** - schnell finden was er sucht
4. **Visuelle Statistiken** - Git-Aktivität, Zeitverläufe
5. **Portfolio-Ansicht** - Projekte als ansprechende Kacheln

**Explizit NICHT im Scope:**
- AI-Integration (Summaries etc.) - kommt später
- Runner (Remote-Interaktion mit Projekten) - kommt später
- Änderungen am Collector
- Änderungen am DB-Schema

---

## Minimum Viable Product (MUSS existieren)

Bevor du `<promise>MVP-COMPLETE</promise>` ausgibst, müssen diese Features funktionieren:

### 1. Navigation & Layout
- [ ] Funktionierende Sidebar/Navigation
- [ ] Responsive (Desktop + Tablet mindestens)
- [ ] Konsistentes visuelles Design

### 2. Projektliste
- [ ] Alle Projekte werden angezeigt
- [ ] Mindestens eine Ansicht (Tabelle ODER Kacheln)
- [ ] Basis-Filterung (z.B. nach Name suchen)

### 3. Konversations-Viewer
- [ ] Sessions eines Projekts auflisten
- [ ] Session-Entries anzeigen (User-Messages, Assistant-Responses, Tool-Calls)
- [ ] Lesbar formatiert (Markdown rendern, Code-Highlighting)
- [ ] Pagination oder Infinite Scroll (Sessions können 1000+ Entries haben)

### 4. Zeitliche Übersicht
- [ ] Mindestens EINE visuelle Darstellung von Aktivität über Zeit
- [ ] Kann einfach sein (z.B. Activity-Heatmap, Timeline, Chart)

---

## Kreative Freiheit

Nach dem MVP darfst du weitere Features erfinden und implementieren. Beispiele (nicht verpflichtend):

- Kachel-Ansicht für Projekte mit visuellen Previews
- Zeitleisten-Ansicht mit Zoom (wie Gantt-Chart)
- Git-Statistiken (Commits pro Tag/Woche, LOC-Änderungen)
- Dark/Light Mode
- Keyboard-Navigation
- Session-Diff-Ansicht
- Projekt-Favoriten
- Custom Filter/Saved Views
- ... was immer du für nützlich und umsetzbar hältst

**Entscheide selbst** was als nächstes kommt. Frag dich:
- Was bringt dem Nutzer den meisten Wert?
- Was ist in 1-2 Iterations umsetzbar?
- Was macht das Produkt kohärenter?

---

## Technische Constraints

### API
- Backend URL: `http://localhost:4001` (oder `CLAUDE_ARCHIVE_SERVER_URL`)
- Auth via `X-API-Key` Header
- OpenAPI-Docs: `http://localhost:4001/api/docs`
- Du darfst die API erweitern wenn nötig (neue Endpoints, Query-Parameter)

**WICHTIG: Server selbst starten!**
Der Backend-Server läuft NICHT. Du musst ihn selbst als Background-Service starten:
```bash
cd packages/server && pnpm dev &
# oder mit run_in_background Parameter
```
- Starte den Server im Hintergrund damit du Logs sehen kannst
- Hot-Reload bei Code-Änderungen (kein Neustart nötig)
- Prüfe Server-Logs bei API-Fehlern

### Frontend Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Lies `packages/web/UI-PRIME.md` für Setup-Details

**WICHTIG: Frontend Dev-Server selbst starten!**
```bash
cd packages/web && pnpm dev &
# Läuft auf http://localhost:4005
```
- Starte als Background-Service für Playwright-Screenshots
- Hot-Reload bei Code-Änderungen (kein Neustart nötig)

### Was du NICHT ändern darfst
- Datenbank-Schema (`packages/server/src/db/schema.ts`)
- Collector (`packages/collector/`)

### Was du ändern darfst
- Alles in `packages/web/`
- API-Endpoints in `packages/server/src/routes/`
- Shared Types wenn nötig

---

## Workflow pro Iteration

Führe in JEDER Iteration diese Schritte aus:

### 1. Status Check
```markdown
## Iteration N - Status

### MVP Checklist:
- [x] Navigation & Layout - DONE
- [ ] Projektliste - IN PROGRESS
- [ ] Konversations-Viewer - TODO
- [ ] Zeitliche Übersicht - TODO

### Aktuelles Feature:
[Was du gerade baust]

### Nächstes Feature (geplant):
[Was als nächstes kommt]
```

### 2. Feature-Design
- Beschreibe kurz was du bauen willst
- Definiere "Done"-Kriterien für DIESES Feature
- Halte es klein genug für 1-2 Iterations

### 3. Implementation
- Implementiere das Feature
- Nutze Subagents für parallele Arbeit wenn sinnvoll:
  - `Explore` Agent für Codebase-Recherche
  - `Plan` Agent für komplexe Architektur-Entscheidungen

### 4. Visuelle Verifikation
- Nutze Playwright MCP um Screenshots zu machen
- Prüfe: Sieht das akzeptabel aus? Funktioniert es?
- Bei Fehlern: Debuggen und fixen

### 5. Tests
- Schreibe Tests für das implementierte Feature
- E2E mit Playwright für kritische User-Flows
- Component-Tests für komplexe Logik

### 6. Commit & Push
```bash
git add -A
git commit -m "feat(web): [kurze Beschreibung]"
git push origin ui
```

### 7. Nächste Iteration planen
- Was ist das nächste sinnvolle Feature?
- Update die MVP-Checklist

---

## Progress Tracking

Halte deinen Fortschritt in einer Datei fest, die du in jeder Iteration updatest:

**Datei:** `packages/web/RALPH-PROGRESS.md`

```markdown
# Ralph Wiggum Progress

## MVP Status: X/4 complete

## Completed Features:
1. [Feature] - Iteration N - [kurze Beschreibung]
2. ...

## Current Iteration: N
Working on: [Feature]
Status: [In Progress / Blocked / Done]

## Next Up:
- [Geplantes Feature]

## Decisions Made:
- [Design-Entscheidung und Begründung]
- ...

## Known Issues:
- [Problem das noch gelöst werden muss]
- ...
```

---

## Completion Criteria

### MVP Complete
Wenn alle 4 MVP-Features funktionieren und visuell verifiziert sind:
```
<promise>MVP-COMPLETE</promise>
```

### Fully Complete
Nach MVP + mindestens 2 weitere selbstgewählte Features:
```
<promise>UI-COMPLETE</promise>
```

### Bei Max Iterations (20) ohne Completion
Dokumentiere in `RALPH-PROGRESS.md`:
- Was wurde erreicht
- Was fehlt noch
- Empfehlungen für nächsten Run

---

## Rate Limit Handling

Falls du auf API Rate Limits stößt (Token-Limit erreicht):

1. **Erkenne das Problem** - Error-Messages wie "rate limit", "quota exceeded", "429"
2. **Warte aktiv** - Nutze den `wait` Befehl:
   ```
   Waiting for rate limit reset...
   ```
3. **Dokumentiere es** - Notiere in RALPH-PROGRESS.md dass ein Wait stattfand
4. **Setze fort** - Nach dem Wait, mache weiter wo du aufgehört hast

**Wichtig:** Verliere nicht den Kontext! Dein Progress-File hilft dir nach einem Wait weiterzumachen.

---

## Anti-Patterns (vermeide diese)

1. **Lokales Optimum** - Nicht mehr als 2 Iterations am gleichen Feature ohne neuen Nutzerwert
2. **Premature Polish** - Keine Animationen/Micro-Interactions bevor MVP steht
3. **Scope Creep** - Keine Features die die API nicht unterstützt (kein Backend-Umbau für ein Frontend-Feature)
4. **Big Bang** - Nicht 5 Features gleichzeitig anfangen, eins nach dem anderen
5. **Test-Schulden** - Jedes Feature braucht mindestens einen Happy-Path-Test

---

## Start

1. Lies `packages/web/UI-PRIME.md` für Projekt-Setup
2. Lies die API-Dokumentation (`/api/docs`)
3. Mache einen Playwright-Screenshot vom aktuellen Stand
4. Erstelle `packages/web/RALPH-PROGRESS.md` mit initialem Status
5. Beginne mit MVP Feature 1: Navigation & Layout

Los geht's! Baue etwas Nützliches.
