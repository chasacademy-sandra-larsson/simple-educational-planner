# Intags-agenten: AI-drivet konversationsintag som primär inmatningskanal

Rektorn/administratören matar in projektdata genom att **prompta och ladda upp filer** (personallistor i Excel/CSV, klasslistor, löptext) i en chatpanel i kontrollrummet, istället för att klicka igenom formulär. En agent-loop med verktyg skriver datan till databasen via samma validerade vägar som UI:t.

Agentens roll är **orkestrerare, inte orakel**. Den uppfinner aldrig organisatoriska sanningar — vem som undervisar en kurs, en lärares [[tjänstegrad]], ett rums kapacitet kan bara människan leverera; agenten frågar efter dem. Den deterministiska källan till "vad saknas" är [[preflight]]: agenten loopar *läs in → skriv → kör preflight → ställ riktade frågor om luckorna → upprepa* tills schemat kan genereras. Sanningen om vad som krävs kommer från kod, inte från modellens omdöme.

De flesta parametrar behöver agenten aldrig fråga om: alla tid/lunch/rast-inställningar har redan fungerande defaults (`DEFAULT_SETTINGS` i `server/src/solver/data-loader.ts`). Det som återstår är de irreducibla organisatoriska fakta — `courseInstances.teacherId` (hård preflight-blockerare), `teacherServiceDistributions.servicePoints`, `rooms.capacity`/`allowedSubjects`, kursens `subject`.

Chat är en bra **inmatningsyta** men en dålig **granskningsyta**. Detta ersätter därför inte kontrollrummet ([ADR-0009](./0009-single-workspace-ui.md)) utan förutsätter det: chatten är kanalen man matar systemet genom, kontrollrummets tabeller och schemarutnät är ytan man verifierar i. Skrivgrinden är oförändrad från [ADR-0008](./0008-schedule-lifecycle.md): agenten får skriva grunddata direkt (allt är redigerbart efteråt), men schemat blir aldrig aktivt utan explicit "Använd".

## Considered Options

- **MCP-server av backend**: rätt lager om *externa* klienter (Claude Desktop m.fl.) ska driva flödet, men målgruppen är rektorer utan Claude-konto — chatten måste bo i appen. För en in-app-chat vars verktyg ändå anropar egna backend-funktioner är MCP onödig indirektion. Avvisad för v1; kan återbesökas utan att designen blockerar det.
- **Förslags-läge per batch** (AI:ns parsningar godkänns innan skrivning): avvisad — återinför klickandet som ska bort. Allt agenten skriver är redigerbart i kontrollrummet och schemat gate:as redan av livscykeln.
- **"AI:n resonerar fram alla parametrar" i fri form**: avvisad — de flesta parametrar har redan defaults (behöver ingen AI), och de irreducibla fakta kan ingen modell veta, bara fråga om.

## Consequences

- Nytt beroende i `server/package.json`: `ai` (Vercel AI SDK) + `@ai-sdk/anthropic` (`zod` finns redan).
- Ny route `server/src/routes/assistant.ts`: `POST /api/projects/:projectId/assistant` — streamande agent-loop under samma JWT-middleware som övriga routes; `req.userId`-scoping gäller varje verktygsanrop.
- Verktygsuppsättning (återanvänder befintlig route-/service-logik): `list_*` (läs), `add_teacher`, `set_service_points`, `assign_course_teacher`, `add_room`, `update_project_settings`, `run_preflight`, `generate_schedule`. **Inga destruktiva verktyg i v1** (ingen delete).
- Systemprompt-regler: kör alltid preflight efter en skrivbatch och rapportera läget; hitta aldrig på tjänstegrad/kapacitet/lärartilldelning — fråga; svara på svenska.
- Filuppladdning: ny endpoint som extraherar text/struktur ur CSV/XLSX server-side (riktig XLSX-parser krävs, t.ex. SheetJS — dagens CSV-import är positionsbunden `readAsText` och `.xlsx`-accepten i UI:t är trasig). Innehållet läggs i agentens kontext; modellen mappar kolumner via verktygsanrop.
- Frontend: chatpanel i kontrollrummet (drawer/rail) via AI SDK:s `useChat`; verktygsanrop renderas som händelser ("La till 32 lärare ur personallista.xlsx", "Preflight: 3 varningar kvar").
- `ANTHROPIC_API_KEY` endast server-side; `server/.env.example` skapas (saknas idag).
- Kostnad per prompt hamnar på produkten — hanterbart i denna skala men ett produktbeslut, inte bara tekniskt.
- `ServiceAllocationStep`s auto-matchningsheuristik (hårdkodad prefix-matchning, buggig `MAX_POINTS_PER_TEACHER = 600`, döda optimerings-reglage) ersätts i praktiken av agentens `assign_course_teacher`-flöde och ska inte vidareutvecklas.
- Sekvensering: byggs som **Fas 5** i [UI-CONSOLIDATION-PLAN](../UI-CONSOLIDATION-PLAN.md), efter Fas 1–2 (kontrollrummet måste finnas som granskningsyta), parallellt med Fas 3–4 vid behov.
