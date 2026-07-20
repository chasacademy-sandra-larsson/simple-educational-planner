# En samlad arbetsyta ersätter wizarden och de parallella tabbarna

Appen har idag **två separata UI:n som konfigurerar samma projektdata**: en 5-stegs `OnboardingWizard` (hostas i `/dashboard`) och en tabb-baserad uppsättning sidor under `/projects/[id]/*`. Fyra av sju tabbar (Klasser, Lärare, Salar, Inställningar) duplicerar wizard-steg; tidsinställningar och termindatum matas in på två ställen med olika fältuppsättningar. Dessutom finns **tre olika "schema"-ytor** med olika betydelse (placerat rutnät, arbetsbelastnings-kalkyl, generator) och dashboardens "framsteg" är `Math.random()`.

Vi konsoliderar till **en arbetsyta** under `/projects/[id]` som fungerar som ett kontrollrum: schemat i mitten, resurser (klasser, lärare, salar, inställningar) i paneler/drawers runt om, preflight och generering alltid tillgängliga. Wizarden och de duplicerade ytorna tas bort. `/dashboard` blir enbart projektlista.

Beslutet följer appens redan etablerade filosofi: preflight *blockerar inte* ([[preflight]], [ADR-0008](./0008-schedule-lifecycle.md)) — användaren ska kunna generera tidigt och förbättra iterativt, inte tvingas igenom en linjär checklista innan något syns.

## Considered Options

- **Behåll båda, synka data mellan dem.** Avvisades — dubbel underhållsbörda och två mentala modeller kvarstår; själva källan till "bök".
- **Behåll wizarden, förbättra den.** Avvisades — en front-loaded wizard med en enda spara-på-slutet motsäger den iterativa generera→inspektera-loopen som schemaläggare faktiskt arbetar i.
- **Samlad arbetsyta (valt).** En yta, slumpvis access till resurser, schemat som huvudyta, inkrementell sparning.

## Consequences

- `/dashboard` reduceras till projektlista + skapa projekt. Slutar hosta `OnboardingWizard` och inline-`ScheduleView`. Den falska `getProjectProgress`-slumpen tas bort.
- `/projects/[id]` (idag tunn "Översikt") blir kontrollrummet — huvudytan är det placerade schemat.
- Resurshantering flyttar från fristående helsides-tabbar till paneler/drawers i arbetsytan. Djuplänkar (`/projects/[id]/teachers` osv.) kan behållas som ingångar som öppnar rätt panel.
- **En schema-yta**: det placerade rutnätet (från `ScheduleView`) är centrum; generering + preflight (från `schedule-generator`) blir en action + statuspanel; arbetsbelastnings-kalkylen (`weekly-schedule`) degraderas till ett sekundärt underlags-läge, inte en konkurrerande topp-tabb.
- **En implementation per datadomän.** Wizard-stegen och tabbarna dubblerar logik — exakt vilken som överlever avgörs i migreringsplanen ([UI-CONSOLIDATION-PLAN.md](../UI-CONSOLIDATION-PLAN.md)).
- Sparning blir inkrementell (per ändring), inte en batch på slutet. `ProjectContext` är redan byggt för detta.
- Kursplanering/curriculum (dagens tunga `ClassesAndCoursePlanStep` med Skolverket-pickers) är den enskilt tyngsta biten och får en egen dedikerad yta — behandlas som ett eget designspår, inte som en panel bland andra.
- Manuell drag-drop-editering av schemat förblir v2 ([ADR-0008](./0008-schedule-lifecycle.md)). Arbetsytan är "generera → inspektera → nudga en constraint → generera om", inte en schemaeditor.
