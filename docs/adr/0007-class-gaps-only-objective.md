# Klass-håltid som enda optimeringsmål i v1

Solverns enda objective är `Minimize: total_class_gap_minutes` (summa av gap > 20 min mellan klassens lektioner samma dag, exklusive lunch). Den befintliga `single_lesson_day_penalty`-koden tas bort.

## Considered Options

- **Multi-objective (klass + lärare, viktad summa)**: minimera både klass-håltid och lärar-håltid. Avvisades för v1 — vikterna kräver kalibrering och dubbla objectives gör solvern svårare att felsöka.
- **Behåll single-lesson-day-penalty som sekundär term**. Avvisades — den löste ett delproblem (konsolidera deltidslärares lektioner) som nu är *hard* via step-funktionen för lediga dagar. Kvarvarande effekt är noise.
- **Lexikografisk optimering (riktig prio-ordning)**: kör solvern flera gånger med ökande constraints. Avvisades — kostar 2× solvertid; viktad summa med stora vikt-skillnader är good enough.

## Consequences

- Eleverna får tätare scheman; lärarens scheman blir vad de blir så länge tjänstegrads-constraintet håller.
- Om användaren senare upplever att lärarna får dåligt utfördelade dagar är det ett v2-mål att addera lärar-relaterad optimering.
