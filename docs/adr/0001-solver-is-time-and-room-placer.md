# Solvern är en tidslucks- och rumstilldelnings-placerare, inte en tilldelnings-solver

Solvern tar lärare som färdig input från upstream-tjänstefördelningen och *väljer aldrig* vilken lärare som ska hålla en lektion. Solverns enda jobb är att placera lektioner i tid samt välja rum bland kompatibla rum (där `allowedSubjects` matchar kursens ämne). Vi delade upp problemet så här eftersom tjänstefördelning är ett separat optimeringsproblem som styrs av lärarens behörighet och önskemål, vilket är data som inte finns i Skolverkets API.

## Consequences

- Fälten `courseInstances.preferredTeacherId` och `preferredRoomId` är fel namngivna — de är hard constraints, inte preferenser. De ska döpas om till `teacherId` och `roomId`.
- Om `teacherId` är `null` när solvern startas är kursen inte redo att schemaläggas → preflight ska blockera.
- `roomId` får vara `null` (det vanliga fallet) — solvern väljer rum då. Bara satt vid lås (t.ex. Idrottshall för Idrott).
