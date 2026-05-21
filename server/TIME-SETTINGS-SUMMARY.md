# Tidsinställningar: Implementeringssammanfattning

## Implementerade ändringar

### 1. Uppdaterad `projects` tabell ✅

Lagt till följande tidsinställningar (alla nullable för flexibilitet):

- `earliestLessonStart` (TIME) - När lektioner tidigast kan starta (t.ex. "08:00:00")
- `latestLessonEnd` (TIME) - När lektioner senast kan sluta (t.ex. "17:00:00")
- `defaultLessonDuration` (INTEGER, minuter) - Standard längd för lektioner (t.ex. 60 minuter)
- `mentorTimePerWeek` (INTEGER, minuter) - Mentorstid per vecka (t.ex. 30 minuter)
- `lunchDuration` (INTEGER, minuter) - Lunchlängd (t.ex. 45 minuter)
- `earliestLunchTime` (TIME) - Tidigast lunchtid (t.ex. "11:30:00")
- `latestLunchTime` (TIME) - Senast lunchtid (t.ex. "13:30:00")
- `shortestBreakBetweenLessons` (INTEGER, minuter) - Kortast rast mellan lektioner (t.ex. 5 minuter)
- `longestBreakBetweenLessons` (INTEGER, minuter) - Längst rast mellan lektioner (t.ex. 15 minuter)

### 2. Uppdaterad `course_instances` tabell ✅

Lagt till fält för att åsidosätta standard lektionslängd:

- `lessonDuration` (INTEGER, minuter, nullable) - Om `NULL`, använd projektets `defaultLessonDuration`. Om satt, använd detta värde för denna kurs.

## Användningsexempel

### Projekt med tidsinställningar

```typescript
{
  id: "uuid",
  name: "Teknikprogrammet",
  earliestLessonStart: "08:00:00",
  latestLessonEnd: "17:00:00",
  defaultLessonDuration: 60,  // 60 minuter
  mentorTimePerWeek: 30,      // 30 minuter per vecka
  lunchDuration: 45,           // 45 minuter
  earliestLunchTime: "11:30:00",
  latestLunchTime: "13:30:00",
  shortestBreakBetweenLessons: 5,   // 5 minuter
  longestBreakBetweenLessons: 15,   // 15 minuter
}
```

### Kursinstans med standard längd

```typescript
{
  id: "uuid",
  courseCode: "MATMAT01",
  courseName: "Matematik 1",
  lessonDuration: null,  // Använd projektets defaultLessonDuration (60 min)
  ...
}
```

### Kursinstans med anpassad längd

```typescript
{
  id: "uuid",
  courseCode: "LAB001",
  courseName: "Labbar i kemi",
  lessonDuration: 90,  // Denna kurs är 90 minuter istället för standard 60
  ...
}
```

## Validering (rekommenderas i API-lagret)

- `earliestLessonStart` < `latestLessonEnd`
- `earliestLunchTime` < `latestLunchTime`
- `shortestBreakBetweenLessons` <= `longestBreakBetweenLessons`
- Alla tidsvärden måste vara positiva
- `defaultLessonDuration` > 0 (om satt)
- `lessonDuration` > 0 (om satt)

## Datatyper

- **TIME**: PostgreSQL TIME-typ för tider (format: "HH:MM:SS", t.ex. "08:00:00")
- **INTEGER**: För minuter och varaktigheter

## Nästa steg

- Uppdatera API routes för att stödja tidsinställningar
- Uppdatera frontend för att visa och redigera tidsinställningar
- Implementera validering i API-lagret

