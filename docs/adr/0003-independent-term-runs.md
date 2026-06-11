# HT och VT som oberoende solver-körningar i v1

Solvern körs separat för höst och vår. En kurs som spänner båda terminer (t.ex. "Matematik 1c" med `terms: ["term1", "term2"]`) får alltså olika positioner i HT-schemat och VT-schemat — det finns ingen mekanism som tvingar vårschemat att ärva positioner från höstschemat för stabilitet.

## Considered Options

- **Inherit**: kör HT först, lås kurser som spänner båda terminer, kör VT med dessa fixerade. Avvisades för v1 — kräver "fixerade lektioner" som indata och dubblar solver-tiden.
- **Joint optimization**: en enda körning som producerar båda terminerna samtidigt. Avvisades — state space dubblas, INFEASIBLE-lägen blir svårare att förklara.

## Consequences

- Användaren och eleverna får ett *nytt* schema i januari även för kurser som inte ändras. I v1 är detta accepterat.
- v2 behöver lägga till inherit-läget. Datamodellen behöver inte ändras för det — `generatedSchedules.status` räcker som mekanism.
