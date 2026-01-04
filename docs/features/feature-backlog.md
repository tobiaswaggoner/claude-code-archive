# Feature List (Backlog)

## Outer Loop

Implementiere alle Features, die in folgenden Dateien beschrieben sind.

Gehe dabei iterativ vor: 

Wähle nur das nächste, nicht fertig implementierte Feature und schau Dir nur dieses an. Lese NICHT alle Features initial sondern nur das nächste.

Nur wenn alle Features vollständig implementiert sind, antworte mit:
<promise>COMPLETE</promise>

## Inner loop (pro Feature)

0. Lese die Feature Beschreibung
1. Untersuche die Code Basis und erstelle einen detaillierten Implementationsplan
2. Implementiere den Plan Schritt für Schritt. Alle Features müssen mit Unit Tests abgesichert sein. Es darf keine Linter Fehler geben. Es darf keine failenden Tests geben.
3. Validiere den Plan. Teste das UI mit Playwright um sicherzugehen dass alles end2end funktioniert.
4. Commit und Push

WICHTIG: Gehe nur zum nächsten Feature, wenn das vorige Feature komplett implementiert und validiert ist!
WICHTIG: Hake erledigte Aufgaben nach jedem Teilschritt (Plan,Impl,Val,Com) in diesem Dokument ab. Nutze den "notify" skill um eine kurze Zwischenmeldung bei erreichen jedes Zwischenziels zu geben.
WICHTIG: Das ist eine autonome Implementations Session. Der User ist nicht verfügbar. Bei Unklarheiten entscheide selbst und halte Deine Entscheidungen unten in diesem Dokument fest. 

## Featurelist / Fortschritt

- [ ] docs\features\mark-empty-sessions.md
    - [x] Plan erstellt
    - [ ] Implementiert
    - [ ] Validiert
    - [ ] Commit & Push

---

# Decisions (if any)

## mark-empty-sessions (2026-01-04)

### Definition "Empty Session"
Eine Session ist "leer" wenn sie weder echte User-Interaktionen noch echte Assistant-Outputs hat:
- **real-user**: type=user/human, OHNE toolResult, isMeta, agentId, warmup message
- **assistant**: type=assistant mit echtem Text (nicht nur tool_use oder thinking blocks)

### Implementierungsplan

**1. DB-Schema erweitern**
- `packages/server/src/db/schema/session.ts`: Neues Feld `isEmpty: boolean().default(false)`
- DB Migration generieren

**2. isEmpty Berechnung (Server-seitig)**
- Neue Utility-Funktion `calculateIsEmpty(entries: Entry[]): boolean` in `packages/server/src/lib/entry-utils.ts`
- Logik von session-viewer.tsx portieren (categorizeEntry → real-user/assistant check)

**3. Sync-Route anpassen**
- `packages/server/src/routes/sync.ts`: In `updateSessionAggregates` das `isEmpty` Flag berechnen und setzen

**4. /admin/recalculate Endpunkt**
- Neuer Route-File: `packages/server/src/routes/admin.ts`
- POST /admin/recalculate → Iteriert alle Sessions, berechnet isEmpty neu
- Füge zu routes/index.ts hinzu

**5. API Filter für leere Sessions**
- `routes/sessions.ts`: `listSessionsRoute` bekommt impliziten Filter `isEmpty=false` (nicht als Query-Param, fest eingebaut)
- `routes/sessions.ts`: `getSessionAdjacentRoute` Filter erweitern
- `routes/projects.ts`: sessionCount nur nicht-leere Sessions zählen
- Prüfen: Heatmap/Timeline nutzen /api/sessions → automatisch gefiltert

**6. Schema-Updates für OpenAPI**
- `routes/schemas.ts`: sessionSchema um `isEmpty` erweitern

**7. UI-Types anpassen**
- `packages/web/src/features/sessions/types/session.ts`: Session interface um `isEmpty` erweitern
- Keine weiteren UI-Änderungen nötig, da Filter auf API-Ebene

**8. Tests**
- Unit-Test für `calculateIsEmpty` Funktion
- Integration-Test für recalculate Endpunkt