Ich möchte gerne eine grafische Ansicht haben, wann ich an welchen Projekten gearbeitet habe.

Dazu sollen alle Projekte selektiert werden. Jedes Projekt (Name) wird in einer Reihe angezeigt.

Daneben soll dann eine Zeitansicht angezeigt werden, mit einem "Balken" dort wo an etwas gearbeitet wurde (Session Start / End)

Wir berücksichtigen im Moment nur die Claude Historie (Sessions)

Wichtig: Die Ansicht muss "zoombar" sein --> Min = 24 Stunden (1 Tag) Max = 1 Jahr. Außerdem brauchen wir ein Pan (Horizontales scrolling).

Die angezeigten Projekte sollen gefiltert werden können (Blacklist = Hide). Diese Filteransicht wird im Browser (localStorage) persistiert.

Projekte ohne Session werden im UI gefiltert

Beim Hover über einem Session Balken soll deren Description angezeigt werden.

Beim Klick soll zu dieser Session navigiert werden.

Bei sehr kurzen Sessions muss ggf. eine Mindestbreite verwendet oder ein Icon angezeigt werden, damit man noch hovern / klicken kann. 