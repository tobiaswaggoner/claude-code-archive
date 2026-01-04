# Mark Empty Sessions

Wenn man Claude Code öffnet ohne damit zu interagieren wird eine Session erstellt, die nur "internal" Einträge hat.

Generischer: Wenn eine Session weder eine echte "user" Interaktion noch ein echter "assistant" output enthält, dann ist sie "leer".

Wichtig: Zur Definition von "echt" siehe -> packages\web\src\features\sessions\components\session-viewer.tsx

Wir wollen das Session Schema dahingehend erweitern, dass wir leere Sessions als solche kennzeichnen (boolean)

Das soll automatisch ebim Import automatisch erfolgen. Außerdem erstellen wir einen Administrativen Endpunkt ("recalculate"), der diverse Berechnungen neu anstellen kann. Im Augenblick setzt er nur das Flag neu für alle Sessions.

Im UI sollen Empty Sessions grundsätzlich überall ausgefiltert werden, d.h. wir können das in die API Endpunkte als fixes Flag einbauen.

Das muss auch bei der Kalkulation von "adjacent" Sessions etc. berücksichtigt werden.

Außerdem ist es relevant für die heatmap und den timeline view.

## Aufgabe:

- DBSchema erweitern
- Logik zur Berechnung Empty / nicht Empty generieren
- Sicherstellen, dass der Collector das Flag korrekt kalkuliert
- neuen Endpunkt /recalculate erstellen
- API überall korrigieren
- Sicherstellen dass UI überall mit dem neuen Schema und dem Filter funktioniert.