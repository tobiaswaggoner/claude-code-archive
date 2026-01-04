Ich möchte noch eine Projekt Detailsansicht erstellen. Aktuell führt die Route /projects/project-id auf eine Edit Ansicht.
Ich möchte hier stattdessen eine Detailsansicht erstellen. Die 4 editierbaren Felder (Name, Desciription, UpstreamURL und Archived) sollen in place geändert werden können, wenn man sie anklickt (wechsel von Label zu Textbox).

Unter dem Project Header soll statt der jetzigen Statistiken eine Session History angezeigt werden:

Datum, Anzahl Entries und Beschreibung der Session, chronologisch sortiert nach Session Start. Klick auf die Session führt zu den Details: /sessions/session-id

Außerdem will ich in diese History die Git Historie "hineinmischen". Es soll eine Option geben "Show Git History" (Checkbox).

Wenn angewählt wird neben der Claude Historie auch die Git Historie gelesen und in die chronologie eingefügt (commit message, timestamp, ...)

Es soll optisch klar ersichtlich sein, was git und was Claude ist.