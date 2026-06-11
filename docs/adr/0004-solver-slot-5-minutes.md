# Solver-slot 5 minuter (ned från 15)

Solvern arbetar i 5-minutersluckor (`slot_duration = 5`), inte 15. Skälet är att avrundning i lektionsduration tidigare orsakade stora avvikelser från läroplanens minuter/vecka. Exempel: en kurs på 200 min/vecka uppdelad på 3 lektioner ger `200/3 = 66,67` → med 15-min-luckor rundas detta till `60` → 180 min/vecka faktiskt (20 min bortfall × 17 veckor ≈ 5,7 timmar/termin). Med 5-min-luckor rundas det till `65` → 195 min (diff 5 min/vecka).

## Considered Options

- **Variabel duration inom samma kurs** (t.ex. 60+60+80 = 200, diff 0). Avvisades för v1 — kräver `duration_var` per lektion, mer komplex CP-modell, svårare att förklara ("varför är min måndagsmatte 80 min men onsdagsmatte 60?").

## Consequences

- Variabelrymden för starttider blir 3× större. Performance-acceptabelt för svenska gymnasiestorlekar.
- Kompletteras av regeln att kurser med > 5 min/vecka avrundnings-diff vägras schemaläggas (preflight) — användaren får ändra `lessonsPerWeek` eller `lessonDuration`-override.
