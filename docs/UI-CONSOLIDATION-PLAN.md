# UI-konsolidering — migreringsplan

Konkret plan för att gå från dagens **två parallella UI:n** till **en samlad arbetsyta**, enligt [ADR-0009](./adr/0009-single-workspace-ui.md). Kompletterar [`SCHEDULER-V1-PLAN.md`](./SCHEDULER-V1-PLAN.md) (solver-spec) och [`CONTEXT.md`](../CONTEXT.md) (glossary).

Konceptskiss av målbilden: kontrollrums-Artifact (schema i mitten, resurser vänster, preflight höger).

## Nuläge — inventering

### Två skal
| Skal | Roll idag | Öde |
|---|---|---|
| `/dashboard` (`app/dashboard/page.tsx`) | Hostar `ProjectList` + `OnboardingWizard` + inline `ScheduleView`; sidebar Hem/Inställningar/Schema; `getProjectProgress` = `Math.random()` | **Krymper** till enbart projektlista |
| `/projects/[id]/*` | Tabb-baserad; `layout.tsx` + `ProjectContext.tsx` + 7 tabbar | **Överlever** som arbetsytan |

### Duplicerad funktionalitet
| Datadomän | Wizard-steg | Tabb-motsvarighet | Överlevare (förslag) |
|---|---|---|---|
| Klasser + kursplan | `ClassesAndCoursePlanStep.tsx` (~1300 rader, Skolverket-pickers) | `classes/page.tsx` + `ComprehensiveCoursePlanner` | **Eget spår** (se Fas 4) — logiken från wizard-steget skördas |
| Lärare | `TeachersStep.tsx` (~1500 rader, CSV-import, analytics) | `teachers/page.tsx` | **Tabben** + skörda CSV-import & subject-gap-analys från wizard-steget |
| Tjänstefördelning | `ServiceAllocationStep.tsx` (~1700 rader) | inbakad i `teachers/page.tsx` | **Tabben** (matchar CONTEXT: tjänstefördelning = lärarvy) |
| Salar | `RoomsStep.tsx` | `rooms/page.tsx` | **Tabben** + skörda CSV-import |
| Tid + termindatum | `TimeSettingsStep.tsx` | `settings/page.tsx` (`TimeSettingsForm` + `TermDatesForm`) | **Tabben** (detaljerad per-år-modell) |

### Tre schema-ytor
| Komponent | Betyder | Öde |
|---|---|---|
| `ScheduleView.tsx` | Placerat rutnät (Klass/Lärare-vy) | **Blir arbetsytans centrum** |
| `schedule-generator.tsx` (tabb `scheduling`) | Generering + preflight + status-lista | **Blir generera-action + högerpanel** |
| `weekly-schedule.tsx` (tabb `schedule`) | Arbetsbelastnings-kalkyl per termin (ej placerat) | **Degraderas** till sekundärt underlags-läge |

## Faser

Ordnade så att varje fas är körbar och shipbar för sig. Ingen fas lämnar appen trasig.

### Fas 0 — Bryt den ena mentala modellen (låg risk, hög effekt)
Mål: sluta öppna wizarden; gör `/dashboard` till ren projektlista.
- I `app/dashboard/page.tsx`: projektval navigerar till `/projects/[id]` istället för att sätta `currentView`/öppna `OnboardingWizard` inline.
- Ta bort `getProjectProgress`-slumpen och allt UI som gate:as på den (Schema-sidebar-posten).
- Sluta rendera `OnboardingWizard` och `ScheduleView` inline i dashboard. **Radera inte filerna än** — bara koppla loss dem.
- Verifiering: skapa projekt → hamnar i `/projects/[id]`; ingen väg leder längre in i wizarden.

### Fas 1 — Bygg arbetsyte-skalet
Mål: `/projects/[id]` (idag tunn "Översikt") blir kontrollrummet.
- Ersätt `page.tsx`-innehållet (`ProjectSummary`) med kontrollrums-layouten: vänsterrail (resurser), centrum (schema), högerrail (preflight + status).
- Centrum återanvänder `ScheduleView` (Klass/Lärare-toggle, placerat rutnät). Lägg till håltids-markörer + klass-håltid som nyckeltal (ADR-0007/0008).
- Högerrail återanvänder preflight + status-logik ur `schedule-generator.tsx`; "Generera schema" (med timeout-val Snabb/Normal/Grundlig, SCHEDULER-V1-PLAN) blir topbar-action.
- `ProjectContext` matar redan project/teachers/rooms — bygg vidare på den, ingen ny datahämtning.
- Verifiering: generera → draft syns i rutnätet → "Använd" → active (hela ADR-0008-loopen på en skärm).

### Fas 2 — Vik in resurser som paneler/drawers
Mål: resurshantering utan att lämna arbetsytan.
- Flytta lärare/salar/inställningar till drawers som öppnas från vänsterrailen.
- **Avdubbling**: välj tabb-implementationen per domän (se tabell), skörda de bättre bitarna ur wizard-stegen (CSV-import, subject-gap-analys) in i den överlevande.
- Behåll djuplänkar: `/projects/[id]/teachers` etc. öppnar rätt drawer istället för egen helsida (thin redirects/route-handlers).
- Sparning per ändring (inte batch).
- Verifiering: lägg till lärare/sal och redigera tid-inställning från arbetsytan; ändring persisteras direkt och syns vid nästa generering.

### Fas 3 — Riv det döda
Mål: en implementation kvar per sak.
- Radera `OnboardingWizard.tsx` + hela `app/components/onboarding/` (efter att logik skördats i Fas 2 & 4).
- Slå ihop schema-ytorna: behåll `ScheduleView` som centrum; `weekly-schedule` blir ett underlags-läge (flik/knapp i arbetsytan, ej egen route); ta bort `scheduling`- vs `schedule`-tabb-dubbletten.
- Rensa nu oanvända imports, routes och döda `dashboard`-vyer.
- Verifiering: `npm run lint` + manuell genomgång att inga döda länkar/routes pekar mot borttaget.

### Fas 4 — Kursplanerings-ytan (eget designspår)
Mål: den tunga curriculum-biten får en genomtänkt egen yta.
- `ClassesAndCoursePlanStep` (Skolverket-driven, nästlad wizard-i-wizard, term-för-term) är den enskilt tyngsta UX-knuten — förtjänar egen skiss innan kod.
- Skörda den fungerande logiken (program/inriktning/kurs-hämtning via Skolverket-proxyn, 2500-poängsvalidering) — kasta bara steg-strukturen.
- **Beslut som behöver tas separat**: ska kursplanering ligga i arbetsytan (drawer) eller vara en egen full yta? Curriculum har status `draft/approved/archived` — approve-flödet påverkar layouten.

## Risker & att bevaka
- **Skolverket-pickern** i `ClassesAndCoursePlanStep` bär mest logik — får inte tappas. Fas 4 skördar innan Fas 3 raderar.
- **Inkrementell sparning**: wizarden batchar på slutet; tabbarna sparar direkt. Målet är tabb-beteendet — kontrollera att inget flöde förlitar sig på batch-sparningen.
- **CSV-import** (lärare, salar) finns bara i wizard-stegen — skörda i Fas 2 innan radering.
- **Curriculum-reparation**: `classes/page.tsx` har en "initiera kursplaner"-action för klasser utan curriculum — måste följa med till den nya klass-ytan.

## Utanför scope (v2, enligt ADR-0008)
- Drag-drop-editering av draft-schemat.
- Baseline-jämförelse av klass-håltid mellan körningar.
