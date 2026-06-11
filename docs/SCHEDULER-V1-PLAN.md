# Scheduler v1 — plan

Den här filen är spec:en för v1 av schemagenereringen. Den fångar besluten från grilling-sessionen och kompletterar [`CONTEXT.md`](../CONTEXT.md) (glossary) och `docs/adr/` (arkitekturbeslut).

## Översikt

- **Solvern är en tidslucks- och rumstilldelnings-placerare** ([ADR-0001](./adr/0001-solver-is-time-and-room-placer.md)). Lärare är input via [[tjänstefördelning]]; tid och rum är output per lektion.
- **Slot-granularitet 5 min** ([ADR-0004](./adr/0004-solver-slot-5-minutes.md)).
- **HT och VT är oberoende körningar i v1** ([ADR-0003](./adr/0003-independent-term-runs.md)).

## Hard constraints

| # | Constraint | Anmärkning |
|---|---|---|
| 1 | Inga dubbelbokningar — klass, lärare, rum | `AddNoOverlap` per resurs |
| 2 | Dagsram: `earliestLessonStart` ≤ start, slut ≤ `latestLessonEnd` | Projekt-setting |
| 3 | Varje klass har en egen lunch på `lunchDuration` minuter inom `[earliestLunchTime, latestLunchTime]` | [ADR-0006](./adr/0006-class-specific-lunch.md) |
| 4 | Rumssubject-matchning: `room.allowedSubjects ⊇ {course.subject}` (eller `allowedSubjects = null`) | Hard |
| 5 | Låst rum: om `courseInstance.roomId` är satt måste alla lektioner av kursen ligga där | Specialfall (Fysik → labbsal) |
| 6 | Klass-rast ≥ `shortestBreakBetweenLessons` (default 5 min) | Projekt-setting |
| 7 | Lärar-rast ≥ `teacherBreakMinutes` (default 15 min) | Ny projekt-setting |
| 8 | Lediga dagar för deltidslärare via step-funktion | [ADR-0002](./adr/0002-teacher-free-days-step-function.md) |
| 9 | Max 1 lektion/dag/kursinstans (`AllDifferent` på dagar) | Samma kurs ska inte klumpas |
| 10 | `lessonsPerWeek` ≤ 5 per kursinstans | Annars INFEASIBLE med tydligt fel |
| 11 | Avrundnings-diff ≤ 5 min/vecka per kursinstans | Annars vägra schemalägga kursen |

## Objective (soft)

```
Minimize: total_class_gap_minutes
```

- "Gap" = > 20 min mellan klassens lektioner samma dag.
- Lunchen exkluderas.
- "Innan första lektion" och "efter sista lektion" räknas inte.
- Den befintliga `single_lesson_day_penalty`-koden ska tas bort ([ADR-0007](./adr/0007-class-gaps-only-objective.md)).

## Modell-detaljer

- **Lektionsduration**: auto från `minutesPerWeek / lessonsPerWeek`, kan overridas via `courseInstance.lessonDuration`. Alla lektioner i samma kurs har samma längd i v1.
- **Rumtilldelning per lektion** ([ADR-0005](./adr/0005-room-assigned-per-lesson.md)).
- **Klasstorlek** ignoreras (alla klasser ≤ 32, alla rum ≥ 32 — kapacitet är v2-feature).
- **Mentorstid**: pseudo-kurs, 30 min/vecka per klass, ämne `"mentorstid"`, lärare = klassens mentor (`classMentors`), rum = vilket ledigt som helst. Visas i schemavyn som "Mentorstid" (lärarens namn visas separat i lektionscellen).

## Datamodell-ändringar

### Nya fält

- `courses.subject` (text, från Skolverkets API).
- `projects.fullTimeServicePoints` (integer, t.ex. 600 eller 700 — konfigureras vid projektskapande).
- `projects.teacherBreakMinutes` (integer, default 15).
- `generatedSchedules.status` (enum: `draft | active | superseded`).

### Namnbyten

- `courseInstances.preferredTeacherId` → `teacherId` (hard, inte preferens).
- `courseInstances.preferredRoomId` → `roomId` (hard, inte preferens).
- Motsvarande fält i `SolverInput` (`solver/types.ts`) följer med.

### Borttagning i `scheduler.py`

- `single_lesson_day_penalty`-koden.
- Den gemensamma kärnlunch-perioden.
- Hårdkodat `teacher_break_duration = 15` (ersätts av projekt-setting).

### Tillägg i `scheduler.py`

- En `class_lunch_start`-variabel per klass + no-overlap mot klassens lektioner.
- En `room_var` per lektion med subject-matchnings-constraint och no-overlap per rum.
- `AllDifferent` på dagar per kursinstans.
- `workDaysPerWeek` hard constraint per deltidslärare (step-funktion).
- Klass-håltids-objective.
- Slot-granularitet 5 min istället för 15.

## Preflight

Aritmetiska checks som körs *innan* solvern startas. Resultatet visas som varningar i UI:t — användaren kan ändå försöka köra solvern.

- Per deltidslärare: passar lektionerna inom `workDaysPerWeek × max-lektioner/dag`?
- Per klass: passar lektionerna inom `5 × max-lektioner/dag`?
- Per ämne: räcker rumstid med `subject ∈ allowedSubjects`?
- Per kursinstans: `lessonsPerWeek ≤ 5`?
- Per kursinstans: avrundnings-diff ≤ 5 min/vecka?
- Per kursinstans: `teacherId` är satt (annars är kursen inte redo)?
- Per kursinstans: `lessonsPerWeek = 0` — varning "Kursen schemaläggs inte; justera `lessonDuration` eller `lessonsPerWeek`".

## Schema-livscykel ([ADR-0008](./adr/0008-schedule-lifecycle.md))

1. Användaren klickar "Generera schema" → preflight körs → varningar visas.
2. Solvern körs → producerar ett schema med `status = draft`.
3. Användaren granskar i en preview-vy → klickar "Använd".
4. Det förra `active`-schemat för samma `(project, term)` blir `superseded`.
5. Det nya schemat blir `active` och visas i schemavyn.

Schemavyns header visar **total klass-håltid i minuter** för det aktiva schemat. Ingen baseline-jämförelse i v1.

## v2 — lämnat utanför

- Manuell drag-drop-editering av draft-schemat.
- Stabilitet mellan HT/VT (vårschemat ärver positioner från höstschemat för kurser som spänner båda terminer).
- Variabel duration inom samma kurs.
- Soft-rebellious mode (relaxa hard constraints för att hitta närmaste lösning vid INFEASIBLE).
- Matsalskapacitet med explicita lunch-slots.
- Förmiddag/eftermiddag-preferenser per kurs.
- Klasstorlek > 32 och rum < 32 (kapacitets-constraint).
- Lärares specifika tids-preferenser (utöver lediga dagar — t.ex. "fredag är min lediga dag").
- Historik-jämförelse av klass-håltid mellan körningar.

## Lärare och tjänstefördelning

[[Tjänstefördelning]] och [[kursfördelning]] är två vinklar på samma underliggande data — en lärare *har* en tjänstefördelning för ett läsår om hon är kursfördelad till minst en kurs det läsåret.

| Tillstånd | Hantering |
|---|---|
| Läraren har kursfördelning för läsåret | Ingår i solvern. Tjänstegrad = `floor(servicePoints / fullTimeServicePoints × 100)` |
| Läraren har ingen kursfördelning för läsåret | Filtreras bort tyst |

## Solver-timeout

- Konfigurerbar per körning (inte projekt-setting). UI visar tre alternativ vid generering:
  - **Snabb** — 60 s
  - **Normal** — 120 s (default)
  - **Grundlig** — 300 s
- Vid timeout:
  - Om en feasible lösning hittats → returnera den med status `FEASIBLE` (även om optimering inte konvergerat).
  - Om ingen feasible hittats → status `TIMEOUT`, tom lessons-lista, felmeddelande som föreslår att öka timeout eller köra preflight.

