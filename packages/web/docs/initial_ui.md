## Ralph Wiggum - Testlauf

Wir wollen jetzt einen Test machen, der ein wenig besonders ist, nämlich das Ralph Wiggum Plugin testen. Liest ihr dazu folgende Seite noch mal durch:

https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum

Was ich vorhabe, ist, dass ich die AI, aka dich, ein komplettes Frontend für unser Tool implementieren lassen möchte. Wobei sowohl die Ideen als auch das Layout als auch die Umsetzung in einer komplett autonomen Session erfolgen soll.

Das ist sowohl ein Techniktest als auch ein reales Projekt. 

Für mein Gefühl ist es dafür elementar, dass wir sehr gute Anweisungen geben und eine sehr gute Phasenübersicht für dieses Plugin. 

Wir haben die Synchronisation fertig, die Datenbank steht, die API ist ebenfalls fertig und wir haben die Authentifizierung implementiert. 

Das eigentliche Frontend ist allerdings komplett gemockt. Das, was aktuell existiert, kann im Prinzip bei Bedarf komplett entfernt werden, abgesehen vom Login. 

Was ich machen möchte ist, dass ich jetzt eine wirklich nutzbare User-Oberfläche generiere.

Ich möchte dazu nur meine Ziele definieren, das heißt, was ich mit diesem Projekt bezwecke, und der Aufbau des User Interfaces, die Gestaltung des User Interfaces und die Features möchte ich im Prinzip komplett autonom von einer kreativen AI definieren und umsetzen lassen in einem einzigen großen Durchgang. 

Das ist ziemlich cutting edge, und es kann durchaus sein, dass es nicht funktioniert. Aber ich möchte, dass wir unseren Besteffort machen und schauen, wie weit wir hier kommen. 

---

## Meine Ziele mit diesem Projekt

Mein Grundproblem ist, dass ich aktuell – insbesondere seit die generativen AI so rapide an Fähigkeiten gewinnt – extrem viele Projekte parallel bearbeiten muss und mittlerweile komplett in Übersicht verloren habe, was ich überhaupt alles schon entwickelt habe in den letzten Jahren. Wenn wir alle Repos synchronisieren, sind das deutlich über 200 Repositories, teilweise beruflich in meiner Karriere als externer Consultant und Berater für Kundenprojekte und teilweise private Projekte oder Experimente. 

Ich arbeite auf verschiedenen Rechnern. Das heißt, ich habe immer aktuell vier bis fünf Devices, teilweise dann noch mit Windows Subsystem for Linux Installationen drauf, in denen ich entwickle. 

Das ist absolut unübersichtlich geworden und dafür habe ich dieses Projekt ins Leben gerufen, das in der Lage ist, im Prinzip den Rechner zu scannen, insbesondere die Claude Code Konversationen zu parsen, da ich aktuell so gut wie alles mit Claude Code mache. Zum anderen über die Git Historien nach Git Repositories zu forschen und das alles an der zentralen Datenbank synchronisiert. 

Mein Ziel ist es, zu wissen, wann ich an was gearbeitet habe, und am Ende möchte ich dann auch querien können über diese Projekte.

In einem weiteren Schritt, der aber out of scope ist für dieses Projekt, möchte ich dann auch direkt mit den Projekten aus diesem User Interface raus interagieren. Das ist der geplante Runner, aber der ist explizit nicht im Scope für diesen Run. 

Was ich gerne haben möchte ist Möglichkeiten, Projekte zu suchen, zu filtern und mir Historien anzuschauen, insbesondere die Konversationen mit Claude Code.

Wir werden jetzt an dieser Stelle noch keine AI-Integration machen für Summaries oder ähnliches. Das kommt später.

Jetzt möchte ich zunächst einmal nur die rohen Daten anschauen. 

Ein wichtiger Punkt ist beispielsweise, dass die Konversationen, die ja in den Session Entries hinterlegt sind, in eine gut lesbare Form am User Interface gebracht werden mit Pagination oder einem Endlos-Scroller. Das heißt, möglichst gut lesbar. 

Und dann möchte ich eine grafische Übersicht statistisch, speziell im Zeitverlauf.

Was ich auf jeden Fall gerne hätte, wäre so eine Art Zeitleistenansicht, das heißt eine scrollbare Ansicht, wo man mit Hilfe von Balken zum Beispiel anzeigen kann, wann an welchem Projekt gearbeitet wurde.

Das heißt eine grafische Ansicht, die man zoomen kann, rein und raus zoomen, und die im Prinzip für jeden Projekt einen Balken anzeigt, an der Stelle, wo gearbeitet wurde.

So was fände ich zum Beispiel toll. 

Andere Statistiken wäre so klassisch, dass die Git-Insights-Anzeige, wir sehen ja anhand der Git-Commits, wie viele Änderungen pro Zeiteinheit über alle Projekte darüber erfolgt sind.

Und wenn man da statistisch, grafisch vor allem Informationen bekommen könnte, wäre das auch toll. 

Ich möchte gerne dann auch die Projektübersicht so ein bisschen portfolio-mäßig aufbauen. Das heißt, zum Arbeiten sind wahrscheinlich tabellarische Informationen am sinnvollsten, aber ich möchte gerne auch eine Kachel-Ansicht haben, wo jedes einzelne Projekt als Kachel angezeigt wird.

Das dann grafisch wirklich anspruchsvoll und ansehnlich dargestellt ist, wäre eine schöne Ansicht. Ich denke, wir werden dann auch AI-generierte Bilder dazu generieren. Das wäre auch noch so eine Idee. 

---

### Deine Aufgabe jetzt:

- Lese die ralph-wiggum Plugin Beschreibung.
- Erzeuge dann einen geeigneten Plan dem wir einem "Ralph Wiggum" Agent geben können.
- Das ist UI, daher halte ich TDD für nicht zielführend, aber eine gute Test Coverage muss sein.
- Max Iterations ist 20
- Der Agent soll kreativ sein, d.h. immer eine Loop ausführen:
  - Ideen generieren für "coole" UI Features
  - Implementations- und Designplan machen
  - Implementieren
  - Iterieren mit Hilfe des Playwright MCP und der Tests
  - commit und push auf diesem Branch
  - Nächstes Feature 

Das muss iterativ funktionieren, keine zu komplexen Features auf einmal.
Wenn das Usage Limit erreicht ist kann der Agent per "wait" auf warten bis wieder Usage frei wird.

Der Agent soll wenn möglich an subagents delegieren.

Änderungen am DB Schema sollen vermieden werden.
Änderungen an der Backend API sind dagegen möglich.
Änderungen am collector sollen nicht erfolgen.