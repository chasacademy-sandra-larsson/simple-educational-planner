# Tidsinställningar för Projekt: Design

## Krav

Ett projekt ska kunna definiera:
1. När en lektion tidigast kan starta
2. När en lektion senast kan sluta
3. Hur länge en lektion får vara (standard för alla lektioner)
4. Hur lång mentorstiden ska vara per vecka
5. Hur lång lunch ska vara
6. Tidigast lunchtid
7. Senast lunchtid
8. Rast mellan lektioner - kortast och längst
9. Möjlighet att åsidosätta lektionslängd per kurs

## Designförslag

### Uppdatera `projects` tabell

Lägg till följande fält:
- `earliestLessonStart` - TIME - När lektioner tidigast kan starta (t.ex. "08:00")
- `latestLessonEnd` - TIME - När lektioner senast kan sluta (t.ex. "17:00")
- `defaultLessonDuration` - INTEGER (minuter) - Standard längd för lektioner (t.ex. 60 minuter)
- `mentorTimePerWeek` - INTEGER (minuter) - Mentorstid per vecka (t.ex. 30 minuter)
- `lunchDuration` - INTEGER (minuter) - Lunchlängd (t.ex. 45 minuter)
- `earliestLunchTime` - TIME - Tidigast lunchtid (t.ex. "11:30")
- `latestLunchTime` - TIME - Senast lunchtid (t.ex. "13:30")
- `shortestBreakBetweenLessons` - INTEGER (minuter) - Kortast rast mellan lektioner (t.ex. 5 minuter)
- `longestBreakBetweenLessons` - INTEGER (minuter) - Längst rast mellan lektioner (t.ex. 15 minuter)

### Uppdatera `course_instances` tabell

Lägg till fält för att åsidosätta standard lektionslängd:
- `lessonDuration` - INTEGER (minuter, nullable) - Om null, använd projektets `defaultLessonDuration`. Om satt, använd detta värde för denna kurs.

## Datatyper

PostgreSQL TIME-typ för tider (t.ex. "08:00:00", "17:00:00")
PostgreSQL INTEGER för minuter

## Exempel

```sql
-- Projekt med tidsinställningar
projects (
  id: uuid,
  name: "Teknikprogrammet",
  earliestLessonStart: "08:00:00",
  latestLessonEnd: "17:00:00",
  defaultLessonDuration: 60,  -- 60 minuter
  mentorTimePerWeek: 30,      -- 30 minuter per vecka
  lunchDuration: 45,           -- 45 minuter
  earliestLunchTime: "11:30:00",
  latestLunchTime: "13:30:00",
  shortestBreakBetweenLessons: 5,   -- 5 minuter
  longestBreakBetweenLessons: 15,   -- 15 minuter
  ...
)

-- Kursinstans med standard längd (60 minuter)
course_instances (
  id: uuid,
  courseCode: "MATMAT01",
  lessonDuration: NULL,  -- Använd projektets defaultLessonDuration
  ...
)

-- Kursinstans med anpassad längd (90 minuter)
course_instances (
  id: uuid,
  courseCode: "LAB001",
  lessonDuration: 90,  -- Denna kurs är 90 minuter istället för standard 60
  ...
)
```

## Validering

- `earliestLessonStart` < `latestLessonEnd`
- `earliestLunchTime` < `latestLunchTime`
- `shortestBreakBetweenLessons` <= `longestBreakBetweenLessons`
- Alla tidsvärden måste vara positiva
- `defaultLessonDuration` > 0
- `lessonDuration` > 0 (om satt)

