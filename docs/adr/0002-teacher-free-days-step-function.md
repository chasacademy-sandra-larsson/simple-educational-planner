# Lediga dagar för deltidslärare via step-funktion (hard)

Antalet garanterade lediga dagar per vecka för en lärare härleds via en **step-funktion på tjänstegrad**, inte via linjär `floor`-beräkning. Detta är en hard constraint — solvern returnerar INFEASIBLE om alla deltidslärare inte kan få sina dagar.

## Step-funktion

`pct = floor(servicePoints / fullTimeServicePoints × 100)`

| Tjänstegrad | Lediga dagar |
|---|---|
| < 50%        | 3 |
| 50–79%       | 2 |
| 80%          | 1 |
| 81–100%      | 0 |

## Considered Options

- **Linjär floor**: `5 - floor(0.8 × 5) = 1` etc. Avvisades — 90%-tjänst skulle få 0 dagar lediga, vilket användaren ansåg orealistiskt eftersom svenska skolor i praktiken hanterar 50/60/80%-tjänster med fasta antal dagar.
- **Soft constraint (objective penalty)** istället för hard. Avvisades — schemaläggaren vill ha en *garanti* för deltidslärarens villkor, inte en optimerings-tendens.

## Consequences

- Heltid (81–100%) → 0 lediga dagar → ingen constraint läggs (besparar variabler).
- En lärare med 0% (eller saknad `teacherServiceDistribution`) hamnar i bracket `< 50%` → 3 lediga dagar → max 2 arbetsdagar. Detta är förmodligen vad man vill, men ska bekräftas i preflight.
- Skolor med annan poäng-norm konfigurerar `projects.fullTimeServicePoints` (600 eller 700 är vanliga).
