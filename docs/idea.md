# Claude-Code-Archive

Ich arbeite sehr viel mit Claude Code an sehr vielen Unterschiedlichen Projekten auf verschiedenen Rechnern.

Claude Code speichert Protokolle immer in ~/.claude/projects/... wobei der Projektname der Foldername ist.

Die Chats werden dabei in JSONL. Das Format ist nicht offiziell dokumentiert, aber es gibt diverse Tools, die die Dateien verarbeiten:

https://github.com/yuis-ice/claude-code-jsonl-editor
https://github.com/withLinda/claude-JSONL-browser 
https://github.com/daaain/claude-code-log
https://github.com/d-kimuson/claude-code-viewer
https://github.com/ZeroSumQuant/claude-conversation-extractor
https://github.com/d-kimuson/claude-code-viewer
https://github.com/yigitkonur/claude-session-exporter


Ich möchte gerne

- Die Dateien automatisch in eine geeignete Datenbank speichern und dabei die Ebene "SOURCE" (PC) hinzufügen.
- Das ganze soll idempotent und non-blocking erfolgen, d.h. auch wenn CLaude Code gerade in die Datei schreibt möchte ich keine Konflikte erzeugen.
- Da es sich in den meisten Fällen um git repos handelt, möchte ich auch die git Daten hinzufügen (git ja/nein, Upstream Repo - in 99% der Fälle gibt es nur eins - wir nehmen dieses)
- Die Git Commit Historie soll wenn vorhanden ebenfalls in der Datenbank gespeichert werden.
- Auf dieser Basis dann ein Webbasiertes UI mit diversen Features bauen, u.a. eine grafische Timeline (wann wurde von wann bis wann an einem Projekt gearbeitet)
- Ich möchte auch eine Analyse und Historie erstellen können.

Erste Aufgabe:

- Analysiere die obigen Repos und das aktuelle ~/.claude/projects Verzeichnis (Benutze Subagents)
- Erstelle einen stark typisierten Parser (TypeScript) für die JSONL Dateien. Unterscheide dabei zwischen den agent-{xxx}.jsonl und den {guid}.jsonl Dateien.
- Dokumentiere die Struktur in einer für ein LLM verständlichen Weise (ich vermute: Type Definition + Kommentare sind am effektivsten?)