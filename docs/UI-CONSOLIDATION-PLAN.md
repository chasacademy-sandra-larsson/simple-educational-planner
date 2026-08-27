# UI-konsolidering — migreringsplan

Konkret plan för att gå från dagens **två parallella UI:n** till **en samlad arbetsyta**, enligt [ADR-0009](./adr/0009-single-workspace-ui.md), med ett AI-drivet intag ovanpå enligt [ADR-0010](./adr/0010-ai-intake-agent.md). Kompletterar [`SCHEDULER-V1-PLAN.md`](./SCHEDULER-V1-PLAN.md) (solver-spec) och [`CONTEXT.md`](../CONTEXT.md) (glossary).

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

## Status

| Fas | Läge | Commit |
|---|---|---|
| 0 — Dashboard → projektlista | ✅ Klar | `5705441` |
| 1 — Kontrollrummet | ✅ Klar | `c3361c3` |
| 2 — Resurser som drawers + defaults-exponering | ✅ Klar | `625a258` |
| 3 — Riv wizarden + slå ihop schema-ytorna | ✅ Klar | `ec880c8` |
| 4 — Kursplanerings-ytan | ✅ Klar — [skiss](https://claude.ai/code/artifact/e8ab61b7-bf90-48c9-9181-4cb7003d9eff) + byggd yta | `curriculum-workbench` |
| 5 — Intags-agenten (AI-chat) | Ej påbörjad (ADR-0010) |  |

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
- **Defaults-exponering (gratis-fixen)**: inställningspanelen visar redan-defaultade fält som skrivskyddad text ("Lektionstid: 08:00–17:00 (standard)") bakom en "Avancerat"-disclosure, istället för öppna inmatningsfält som ser obligatoriska ut. Alla tid/lunch/rast-fält har redan fallbacks i `DEFAULT_SETTINGS` (`server/src/solver/data-loader.ts`) — UI:t ska sluta låtsas att de är obligatoriska beslut. Minskar också parameterytan för Fas 5-agenten.
- **Skörda inte allt**: `ServiceAllocationStep`s auto-matchningsheuristik (hårdkodad prefix-matchning, buggig `MAX_POINTS_PER_TEACHER = 600`, döda optimerings-reglage) ska **inte** migreras till tabben — den ersätts av Fas 5-agentens `assign_course_teacher`-flöde (ADR-0010).
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

**Kartläggningsfynd (aug 2026) — input till skissen:**
- `ComprehensiveCoursePlanner` (2277 rader) är en wizard-i-tabben: 6 steg inuti varje klass-accordion, batch-sparning på slutet — samma mönster som revs ur resten av appen.
- **2500-poängsregeln upprätthålls aldrig** (`isValidTotal = true` hårdkodat) — visas men blockerar inte sparning.
- **TE/webbspecifika fördjupningskurser är hårdkodade** (`WEBB2000X` m.fl.) i en generisk komponent; Skolverket-proxyn levererar redan auktoritativa `diplomaProject`/`individualOption`-poäng som ignoreras.
- **Approve-flödet finns inte i backend**: `status` skrivs `'draft'` en gång, ingen endpoint ändrar den. Läsvägen föredrar redan `approved` — endpointen saknas. Ny yta kräver status-transitions-endpoint.
- Trippelrepresentation `term`/`terms`/`year` är en ständig buggkälla i plannern.
- **Döda filer att radera i Fas 4**: `class-course-planner.tsx`, `course-planner.tsx`, `course-list.tsx` (legacy år-baserad planner) och `onboarding/ClassesAndCoursePlanStep.tsx` (aldrig inkopplad — dess termmatris-UI och 2500-banner skördas som designidéer, inte kod).
- `PUT /classes/:classId/curriculum` gör full delete+reinsert av `course_instances` men **bevarar teacherId/roomId/lessonDuration/year/terms** per courseCode — notera att befintlig year/terms vinner över payloadens.
- **Designriktning för skissen**: en byggyta istället för steg — kurskatalog (Skolverket-driven, per kategori) till vänster, terminskolumner T1–T6 med per-termins poänglast i mitten, poängbudget/validering (2500-mätare, per kategori) till höger, status-badge + "Godkänn"-knapp gated på giltighet. Klasser väljs i rail som i kontrollrummet. `/projects/[id]/classes` förblir egen full yta (tabben), inte drawer.

**Skissen (aug 2026)** — interaktiv Artifact: <https://claude.ai/code/artifact/e8ab61b7-bf90-48c9-9181-4cb7003d9eff>. Fyra zoner (klasser 158px · katalog 258px · terminer 1fr · budget 292px) i samma tokens som kontrollrummet. Tre demo-klasser visar de tre lägena: blockerad (TE26, 1900 p), giltig men obalanserad (TE25, 2500 p + fyra mjuka varningar), godkänd och grön (TE24). Kurser placeras med drag-drop eller klick-kurs → klick-termin; ⇄ på kortet spänner kursen över båda terminerna i året.

**Beslut som skissen tvingar fram (utöver approve-endpointen):**
- **Programfördjupning saknar egen kategori.** Skolverket-proxyn levererar `PROGRAMME_SPECIALIZATION`, men `CourseAssignment.category`-unionen i `app/lib/api/types.ts` har den inte — dagens planner märker om kurserna till `ORIENTATION` (`comprehensive-course-planner.tsx`, specialization-steget). Utan egen kategori går inriktning 300 p och programfördjupning 400 p inte att validera var för sig, vilket budgetpanelen bygger på. Kräver ny kategori i union + DB-data-migrering av felmärkta rader.
- **`GYMNASIEARBETE` finns som label men aldrig som kategorivärde** — gymnasiearbetet sparas som `PROGRAMME_SPECIFIC_SUBJECTS`, vilket gör att programgemensamma ämnen ser ut att vara 100 p för mycket. Samma beslut som ovan.
- **Terminsmodellen**: skissen använder bara `terms: term1..term6` (en eller två terminer per kurs) och härleder `year`. `course_instances` har redan `terms jsonb` + `year int`; `year` blir härledd kolumn eller tas bort. Trippelrepresentationen `term`/`terms`/`year` försvinner.
- **Balansbandet 350–500 p/termin** finns redan i plannern (`ValidateStep`) — skissen gör det till en synlig skena per termin, som mjuk varning (blockerar inte godkännande).
- **Godkänd plan som ändras**: skissen låser inte redigering utan kräver "Återöppna som utkast". Alternativet är versionsbump (`class_curricula.version` finns redan).

**Så här byggdes den (aug 2026):**
- `app/components/curriculum-workbench.tsx` ersätter `ComprehensiveCoursePlanner` i `/projects/[id]/classes`. Domänlogiken (kategorier, terminer, poängbudget, validering) ligger i `app/lib/curriculum.ts` — komponenten räknar inte poäng själv.
- Ny endpoint `PATCH /api/projects/classes/:classId/curriculum/status` (`server/src/routes/projects.ts`). Övergångar: `draft↔approved`, `draft|approved→archived`. Godkännande kräver 2500 p (summan räknas om ur `course_instances`, inte ur lagrade `total_points`), återöppning bumpar `version`. Godkänd plan är låst i UI:t.
- **Buggfix som blockerade hela ytan**: `PUT .../curriculum` lät befintliga `year`/`terms` vinna över payloaden, så en kurs aldrig kunde flyttas mellan terminer. Precedensen är omvänd; `teacherId`/`roomId`/`lessonDuration` bevaras fortfarande. Fel default `['HT','VT']` bytt mot `['term1']`.
- **Målen kan inte summeras rakt av.** Skolverket listar alternativen inom gymnasiegemensamma ämnen i samma lista (Svenska *och* Svenska som andraspråk) — för TE blir katalogsumman 1400 p där kravet är 1100 p. Därför får bara de entydiga kategorierna exakta tak (programgemensamma, inriktning, gymnasiearbete, individuellt val, tillsammans 1000 p för TE), medan gymnasiegemensamma + programfördjupning delar på resten (1500 p). Se `SHARED_BUDGET_CATEGORIES`.
- `terms` normaliseras vid inläsning: gammal data har `['HT','VT']` och översätts med `year` till `term1`..`term6` (`normalizeTerms`), precis som solverns data-loader gör. Auto-initieringen skriver fortfarande `HT`/`VT` — den vägen bör konverteras separat.
- Kurser som finns i Skolverkets katalog får sin kategori och poäng därifrån vid inläsning. **Testprojektets data behöver det**: `Gymnasium 27 Klasser` har 2400 p stämplade som `FOUNDATIONAL_SUBJECTS` per klass (och alla kursplaner står som `approved` utan att någon endpoint satt det). Utan självläkningen visar varje klass fyra blockerande fel.
- **Kvar att radera** (blockerades av behörighetskontrollen vid bygget): `app/components/class-course-planner.tsx`, `course-planner.tsx`, `course-list.tsx` och `app/components/onboarding/ClassesAndCoursePlanStep.tsx` (samt den tomma `onboarding/`-katalogen). Inga referenser pekar på dem.

### Fas 5 — Intags-agenten (chat + filer)
Mål: prompta + ladda upp filer istället för att klicka formulär, enligt [ADR-0010](./adr/0010-ai-intake-agent.md).
- Chatpanel i kontrollrummet (AI SDK `useChat`) mot ny streamande route `server/src/routes/assistant.ts` (`POST /api/projects/:projectId/assistant`), under samma JWT-middleware som övriga routes.
- Verktyg som återanvänder befintlig route-/service-logik: `list_*`, `add_teacher`, `set_service_points`, `assign_course_teacher`, `add_room`, `update_project_settings`, `run_preflight`, `generate_schedule`. Inga destruktiva verktyg i v1.
- Agent-loopen: läs in fil → skriv → kör preflight → fråga riktat om luckor (tjänstegrad, lärartilldelning, kapacitet — de irreducibla fakta) → upprepa tills grönt → generera. Preflight är den deterministiska "vad saknas"-källan; agenten hittar aldrig på värden.
- Filuppladdning: endpoint som extraherar text/struktur ur CSV/XLSX server-side (riktig XLSX-parser, t.ex. SheetJS — dagens `.xlsx`-accept är trasig).
- Nya beroenden i `server/`: `ai` + `@ai-sdk/anthropic`. Ny env-var `ANTHROPIC_API_KEY` (endast server-side); skapa `server/.env.example` (saknas idag).
- Skrivgrind: agenten skriver grunddata direkt (redigerbart i kontrollrummet); schemat gate:as som alltid av draft → "Använd" (ADR-0008). Chatten sammanfattar varje skrivning; kontrollrummets tabeller är granskningsytan.
- **Sekvensering**: kräver Fas 1–2 (kontrollrummet måste finnas som granskningsyta; lärar-ytans avdubbling avgör vilka funktioner verktygen speglar). Kan köra parallellt med Fas 3–4.
- Verifiering: ladda upp en rörig personallista (CSV + XLSX) → agenten skriver lärare → preflight-luckor rapporteras i chatten → svara på frågorna → generera → draft syns i rutnätet.

## Risker & att bevaka
- **Skolverket-pickern** i `ClassesAndCoursePlanStep` bär mest logik — får inte tappas. Fas 4 skördar innan Fas 3 raderar.
- **Inkrementell sparning**: wizarden batchar på slutet; tabbarna sparar direkt. Målet är tabb-beteendet — kontrollera att inget flöde förlitar sig på batch-sparningen.
- **CSV-import** (lärare, salar) finns bara i wizard-stegen — skörda i Fas 2 innan radering.
- **Curriculum-reparation**: `classes/page.tsx` har en "initiera kursplaner"-action för klasser utan curriculum — måste följa med till den nya klass-ytan.

## Utanför scope (v2, enligt ADR-0008)
- Drag-drop-editering av draft-schemat.
- Baseline-jämförelse av klass-håltid mellan körningar.
