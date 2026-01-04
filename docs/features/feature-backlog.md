# Feature List (Backlog)

## Outer Loop

Implementiere alle Features, die in folgenden Dateien beschrieben sind.

Gehe dabei iterativ vor: 

Wähle nur das nächste, nicht fertig implementierte Feature und schau Dir nur dieses an.

Nur wenn alle Features vollständig implementiert sind, antworte mit:
<promise>COMPLETE</promise>

## Inner loop (pro Feature)

1. Untersuche die Code Basis und erstelle einen detaillierten Implementationsplan
2. Implementiere den Plan Schritt für Schritt. Alle Features müssen mit Unit Tests abgesichert sein. Es darf keine Linter Fehler geben. Es darf keine failenden Tests geben.
3. Validiere den Plan. Verwende dazu bei Bedarf Playwright um das UI manuell zu testen
4. Commit und Push

WICHTIG: Gehe nur zum nächsten Feature, wenn das vorige Feature komplett implementiert und validiert ist!
WICHTIG: Hake erledigte Aufgaben in diesem Dokument ab.
WICHTIG: Das ist eine autonome Implementations Session. Der User ist nicht verfügbar. Bei Unklarheiten entscheide selbst und halte Deine Entscheidungen unten in diesem Dokument fest. 

Hinweis: Nutze den "notify" skill um Zwischenmeldungen bei erreichen eines Zwischenziels zu geben!

- [x] docs\features\project-view.md
    - [x] Plan erstellt
    - [x] Implementiert
    - [x] Validiert
    - [x] Commit & Push
- [ ] docs\features\timeline.md
    - [ ] Plan erstellt
    - [ ] Implementiert
    - [ ] Validiert
    - [ ] Commit & Push


---

# Decisions (if any)

- Project View: InlineEditField als generische shared/ui Komponente implementiert für Wiederverwendbarkeit
- Project View: Timeline-Ansicht direkt in ProjectDetail integriert statt separater Komponente
- Project View: Git-Commits werden nur bei Bedarf geladen (Checkbox-Toggle) für bessere Performance 