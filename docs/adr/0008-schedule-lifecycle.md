# Schema-livscykel: draft → active → superseded

Ett genererat schema sparas i `generatedSchedules` med status `draft`. Det blir inte synligt i den ordinarie schemavyn förrän användaren explicit klickar "Använd". Det förra `active`-schemat blir då `superseded` och behålls som historik.

## Considered Options

- **Auto-spara som aktivt**: solverkörning skriver direkt över befintligt schema. Avvisades — en knappklickning skulle radera rektors planering utan ångerväg.
- **Multipla förslag** (solvern genererar 3 olika feasible scheman). Avvisades — förvirrande utan tydliga kriterier för "bättre" och dyrt att producera.
- **Iterativ förfining** (användaren låser delar, kör om för resten). Skjuts till v2 — kräver substantiell editor-UI och fixerade-lektioner-stöd i solvern.

## Consequences

- `generatedSchedules` behöver en `status`-kolumn (enum: `draft | active | superseded`).
- Vid varje "Använd": uppdatera tidigare `active` för samma `(project, term)` till `superseded`, sätt det nya som `active`.
- Om inget schema är `active` visar schemavyn "Inget schema aktiverat ännu".
- Manuell editering av draft är en v2-feature.
