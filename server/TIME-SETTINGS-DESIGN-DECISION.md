# Tidsinställningar: Designbeslut - Projekttabell vs Separat Tabell

## Nuvarande Design: Tidsinställningar i `projects` tabell

```typescript
projects {
  id, name, description,
  earliestLessonStart,     // TIME
  latestLessonEnd,         // TIME
  defaultLessonDuration,   // INTEGER (minuter)
  mentorTimePerWeek,       // INTEGER (minuter)
  lunchDuration,           // INTEGER (minuter)
  earliestLunchTime,       // TIME
  latestLunchTime,         // TIME
  shortestBreakBetweenLessons,  // INTEGER (minuter)
  longestBreakBetweenLessons,   // INTEGER (minuter)
  ...
}
```

## Alternativ: Separat `project_time_settings` tabell

```typescript
projects {
  id, name, description, ...
}

project_time_settings {
  id,
  project_id,              // FK -> projects.id
  earliest_lesson_start,   // TIME
  latest_lesson_end,       // TIME
  default_lesson_duration, // INTEGER
  mentor_time_per_week,    // INTEGER
  lunch_duration,          // INTEGER
  earliest_lunch_time,     // TIME
  latest_lunch_time,       // TIME
  shortest_break_between_lessons,  // INTEGER
  longest_break_between_lessons,   // INTEGER
  created_at,
  updated_at
}
```

## Jämförelse

### ✅ Fördelar med tidsinställningar i `projects` (nuvarande)

1. **Enkelhet**
   - Inga JOINs behövs för att hämta tidsinställningar
   - En query = all projektdata inklusive tidsinställningar

2. **Prestanda**
   - Snabbare queries (ingen JOIN)
   - Mindre komplext för databasen

3. **Sammenhåll**
   - Tidsinställningar är en del av projektet
   - Logiskt att de ligger där
   - En-till-en relation (ett projekt = en set tidsinställningar)

4. **Enkel implementation**
   - Enklare API calls
   - Enklare att förstå och underhålla

5. **Atomiska uppdateringar**
   - Uppdatera projekt + tidsinställningar i samma transaktion
   - Inga risker för inconsistent state

### ❌ Nackdelar med tidsinställningar i `projects`

1. **Större tabell**
   - `projects` tabellen blir större
   - Men: 9 extra kolumner är inte så mycket i praktiken

2. **Mindre flexibilitet**
   - Svårare att dela tidsinställningar mellan projekt (t.ex. "använd samma som Projekt X")
   - Ingen historik över tidsinställningar (om de ändras över tid)

3. **NULL-hantering**
   - Om tidsinställningar är nullable (vilket de är nu), kan projekt ha NULL värden
   - Separat tabell skulle kräva explicit skapande

### ✅ Fördelar med separat tabell

1. **Normalisering**
   - Mer "korrekt" normaliserad design
   - Separerar concerns

2. **Historik (om behövs)**
   - Lättare att lägga till historik i framtiden (t.ex. "vad var tidsinställningarna förra året?")
   - Men: kräver extra logik

3. **Delning (om behövs)**
   - Teoretiskt möjligt att ha "templates" för tidsinställningar
   - Men: inte ett vanligt användningsfall för skolor

4. **Mindre `projects` tabell**
   - `projects` tabellen blir mindre
   - Men: skillnaden är minimal (9 kolumner)

### ❌ Nackdelar med separat tabell

1. **Komplexitet**
   - Alltid behöver JOIN för att hämta tidsinställningar
   - Fler queries/transaktioner att hantera

2. **Prestanda**
   - Längsammare queries (JOIN overhead)
   - Mer komplex för databasen

3. **Data-integritet**
   - Risk för projekt utan tidsinställningar (om inte hanteras korrekt)
   - Kräver triggers eller application logic för att säkerställa existens

4. **Onödig normalisering**
   - Om varje projekt har sina egna tidsinställningar (vilket är troligt)
   - Ingen vinst med att separera

## Rekommendation: Behåll i `projects` tabell

### Varför?

1. **1:1-relation**
   - Ett projekt har exakt en set tidsinställningar
   - Klassiskt fall där det är OK att ha i huvudtabellen

2. **Användningsmönster**
   - Tidsinställningar läses/skrivs alltid tillsammans med projektet
   - De ändras sällan
   - Ingen historik behövs (vanligtvis)

3. **Enkelhet > Komplexitet**
   - För enkla 1:1-relationer är det bättre att ha i samma tabell
   - Separera bara om det ger tydliga fördelar

4. **Prestanda**
   - Inga JOINs = snabbare queries
   - Mindre komplexitet för databasen

## När skulle separat tabell vara bättre?

### Använd separata tabell om:

1. **Du behöver historik**
   - "Vilka tidsinställningar hade projektet förra året?"
   - Kräver då versioning/historik i `project_time_settings`

2. **Du vill dela tidsinställningar**
   - Flera projekt kan använda samma tidsinställningar
   - T.ex. "alla teknikprogram använder samma tidsinställningar"

3. **Tidsinställningar är mycket komplexa**
   - Många fält (>20 kolumner)
   - Olika typer av tidsinställningar för olika delar av projektet

4. **Tidsinställningar ändras ofta**
   - Om tidsinställningar ändras dagligen/veckovis
   - Då kan separering hjälpa med caching/optimering

## Slutsats

**Behåll tidsinställningarna i `projects` tabellen** eftersom:
- ✅ 1:1-relation (ett projekt = en set tidsinställningar)
- ✅ Data läses/skrivs alltid tillsammans
- ✅ Enklare implementation och queries
- ✅ Bättre prestanda (inga JOINs)
- ✅ Ingen tydlig fördel med att separera i detta fall

Om behov uppstår i framtiden (t.ex. historik eller delning) kan man alltid refaktorera till separat tabell, men för nu är det överengineering.

## Praktisk Regel

**Separerar endast om:**
- Relationen är 1:many eller many:many
- Data ändras med olika frekvens
- Data har olika livslängd
- Det ger tydliga fördelar (historik, delning, etc.)

**Behåll i samma tabell om:**
- 1:1-relation
- Data läses/skrivs tillsammans
- Enkelt och fungerar bra

I detta fall: **Behåll i `projects`** ✅

