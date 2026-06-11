# Rumstilldelning per lektion, inte per kursinstans

Solvern tilldelar rum **per lektion**, inte per kursinstans. En klass kan därför ha matematik i sal A102 på onsdagen och B305 på fredagen. Den befintliga `courseInstance.roomId` används bara som *lås* för specialfall (Idrott i idrottshallen, Fysik 1a alltid i L3).

## Considered Options

- **Per kursinstans**: en `room_var` per kursinstans, alla lektioner av kursen i samma rum. Skulle ge pedagogisk förutsägbarhet och färre CP-variabler. Avvisades — användaren prioriterar flexibilitet.
- **"Hemklassrum" per klass**: klassen har ett default-rum, lektioner ligger där om inget annat krävs. Avvisades — kraschar i kollisionen mellan klassens hemrum och andra klassers behov av samma rum.

## Consequences

- En `room_var` per lektion (inte per kursinstans) → fler variabler i CP-modellen.
- Eleverna måste hålla koll på rummet per lektion. Det är så svenska gymnasieskolor i praktiken fungerar redan.
- Subject-matchning (`room.allowedSubjects ⊇ course.subject`) körs som constraint per lektion, inte per kursinstans.
