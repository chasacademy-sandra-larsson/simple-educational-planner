# Schemaläggning för svenskt gymnasium

Det här är en applikation för att planera och generera scheman för svenska gymnasieskolor. En användare (typ rektor eller schemaläggare) skapar ett projekt per skola, fyller i klasser, kurser, lärare och rum, och låter en CP-SAT-baserad solver producera ett veckoschema per termin.

## Language

### Solver och schemaläggning

**Solver / Schemaläggare**:
En Python-process baserad på OR-Tools CP-SAT som tar färdigt-tilldelade lektioner (klass + kurs + lärare) och placerar dem i tid och rum. Solvern *väljer aldrig* lärare — det görs i [[tjänstefördelning]] uppströms.
_Avoid_: scheduler (engelska i UI-strängar), schemaläggare-algoritm, optimerare

**Tjänstefördelning**:
Den aggregerade vyn över en [[lärare]]s arbete för ett läsår: tjänstegrad (`servicePoints`), tilldelade poäng (`assignedPoints`) och de [[kursinstans]]er som ingår. Modelleras i `teacherServiceDistributions` (per lärare per läsår) + `serviceDistributionCourses` (länkar till kursinstanser).
_Avoid_: lärartilldelning (otydligt), assignment, tjänsteomfattning (det är *en del* av tjänstefördelningen, inte hela)

**Kursfördelning**:
Operationen att tilldela en [[kursinstans]] till en [[lärare]] för ett läsår. Att fördela en kurs *är* att uppdatera lärarens [[tjänstefördelning]] — det är samma underliggande data sett från kurs-vinkeln istället för lärar-vinkeln. Rektor gör kursfördelning baserat på lärarens behörighet, önskemål och kursvolym. Producerar tuplar `(klass, kurs, lärare)` som matar solvern.
_Avoid_: ämnestilldelning (för smalt), assignment

**Tjänstegrad**:
En lärares arbetsandel uttryckt som procent: `floor(servicePoints / fullTimeServicePoints × 100)`. Heltidstjänsten i poäng är konfigurerbar per projekt (`projects.fullTimeServicePoints`, t.ex. 600 eller 700). Tjänstegrad bestämmer antalet [[lediga-dagar]].
_Avoid_: tjänsteomfattning (synonym men längre), arbetsbörda

**Lediga dagar**:
Antal hela dagar per vecka som en deltidslärare *garanterat* inte schemaläggs på. Härleds via en step-funktion på [[tjänstegrad]] (50–79% → 2 dagar, 80% → 1 dag, 81–100% → 0). Solvern väljer *vilken* dag. Hard constraint.
_Avoid_: ledighet (kan tolkas som semester), frånvaro, ledig tid

**Preflight**:
Aritmetiska checks som körs *innan* solvern startas och varnar om hard constraints inte kan uppfyllas (t.ex. "lärare X har fler lektioner än vad som ryms i 3 arbetsdagar"). Blockerar inte — användaren kan försöka köra solvern ändå.
_Avoid_: validering (för generell), feasibility-check

### Skolans struktur

**Projekt**:
Ett scenario för en specifik skola, ägt av en användare. Innehåller [[klass]]er, [[kurs]]er, lärare, rum och projekt-globala inställningar (dagsram, lunch, raster, heltidspoäng). En användare kan ha flera projekt (t.ex. "Verklighet 2026/2027" och "Vad-om scenario").
_Avoid_: skola (lite missvisande, en användare kan ha flera projekt per skola)

**Klass**:
En kohort av elever som följer ett gymnasieprogram tillsammans i 3 år (t.ex. "TE26" = Teknikprogrammet, startår 2026). Modellerad som `projectClasses`. Har `startYear` och `graduationYear`.
_Avoid_: kurs (helt annat begrepp), grupp, kohort

**Curriculum / Kursplan**:
En versionsstyrd uppsättning kursinstanser som tillsammans utgör en [[klass]]es 3-åriga utbildning. Måste summera till 2500 gymnasiepoäng. Har status `draft | approved | archived`. Modellerad som `classCurricula`.
_Avoid_: läroplan (för bred — läroplan i svensk skola avser hela GY2025-systemet), pensum

**Kurs / Course**:
En utbildningsenhet definierad av Skolverket (t.ex. "Matematik 1c", kod "MATMAT01c", 100 p). Källan är alltid Skolverkets API.
_Avoid_: ämne (se [[ämne]] — en kurs har *ett* ämne men är inte samma sak), modul

**Ämne / Subject**:
En kategorisering som kopplar [[kurs]] till [[rum]]. T.ex. kursen "Fysik 1a" har ämne `fysik`, och rummet "L3" har `allowedSubjects: ["fysik", "kemi"]`. Hard constraint i solvern. Fältet `subject` på kursen kommer från Skolverkets API.
_Avoid_: kategori (det är ett separat fält `category` på kursen som anger gymnasial kategori-typ, inte ämne)

**Kursinstans / Course instance**:
Kopplingen mellan en [[kurs]] och en specifik [[klass]] inom ett specifikt år. T.ex. "Matematik 1c för TE26 år 1, höst+vår". Bär `teacherId` (från [[tjänstefördelning]]) och eventuellt låst `roomId`. Modellerad som `courseInstances`.
_Avoid_: kurstilldelning, kurs-för-klass

**Mentorstid**:
30 min/vecka per [[klass]] där klassens mentor (en [[lärare]]) träffar klassen. Existerar inte i Skolverkets API. Modelleras som en *pseudo-kurs* i solverns input (klass, lärare = mentorn, ämne = "mentorstid", lessonsPerWeek = 1, lessonDuration = 30).
_Avoid_: mentorsmöte, klassråd, hemklass-tid

**Lärare**:
En person som undervisar kurser. Har en [[tjänstegrad]] per [[läsår]] (via `teacherServiceDistributions`). Kan vara mentor för en eller flera klasser (`classMentors`).
_Avoid_: instruktör, personal

**Rum**:
En fysisk lokal där lektioner hålls. Har `capacity` (ignoreras i v1 — alla rum antas rymma 32) och `allowedSubjects` (vilka [[ämne]]n får hållas där, `null` = alla).
_Avoid_: sal (synonym men "rum" matchar `rooms`-tabellen), klassrum (för smalt — labb är också ett rum)

### Schemat

**Lektion / Lesson**:
En schemalagd undervisningsenhet med dag, starttid, längd, [[klass]], [[lärare]] och [[rum]]. Solverns output. Längden är derived från `minutesPerWeek / lessonsPerWeek` (kan overridas per [[kursinstans]] via `lessonDuration`).
_Avoid_: pass (kan tolkas som idrottspass), session

**Klass-håltid**:
Tiden i minuter av oanvända luckor (> 20 min) mellan en klasses lektioner samma dag. Lunchen exkluderas. "Innan första lektion" och "efter sista lektion" räknas inte. Total klass-håltid över alla klasser är solverns optimeringsmål.
_Avoid_: håltimme (singular, gammal term — vi mäter i *minuter*, inte timmar), gap, fönster

**Lunchfönster**:
Tidsintervallet inom vilket varje [[klass]] måste få sin lunchpaus. Konfigureras per projekt som `earliestLunchTime` och `latestLunchTime`. Varje klass får en *egen* lunchstart i fönstret — alla klasser har *inte* lunch samtidigt.
_Avoid_: lunchtid (otydligt om det är intervallet eller specifik tid), middagsrast

**Dagsram**:
Tidsintervallet inom vilket lektioner kan schemaläggas. Konfigureras per projekt som `earliestLessonStart` och `latestLessonEnd`. Hard constraint.
_Avoid_: arbetsdag, skoldag

**Genererat schema / Generated schedule**:
En solverkörnings resultat sparat i databasen. Har status `draft | active | superseded`. Bara ett schema per termin kan vara `active` åt gången.
_Avoid_: schemaversion (förvirrande med curriculum-versioner), schema-utkast (matchar bara `draft`)

**Termin**:
Höstterminen (HT) eller vårterminen (VT). Solvern körs *separat* per termin — HT- och VT-scheman är oberoende.
_Avoid_: period (för generellt), halvår

**Läsår**:
Ett akademiskt år, t.ex. "2026/2027" = HT26 + VT27. Klasser har `startYear` och `graduationYear` som ramar in vilka läsår de är aktiva.
_Avoid_: skolår (synonym men "läsår" matchar koden), årskurs (helt annat begrepp — avser gymnasieår 1/2/3)

## Flaggade tvetydigheter

- **"Block-lektion"** — har förekommit i diskussioner men har olika betydelse: (a) två lektioner i rad samma kurs samma dag, eller (b) en längre lektion (90+ min). I v1 är (a) förbjudet (hard: max 1 lektion/dag/kursinstans) och (b) hanteras via `lessonDuration`-override.

- **"Hemklassrum"** — har övervägts men avvisats för v1. Eleverna byter rum mellan lektioner; rum tilldelas *per lektion*, inte per klass eller per kursinstans.

- **"Preferens"** vs **"krav"** — fälten `preferredTeacherId` och `preferredRoomId` i nuvarande kod är felaktigt namnsatta. De är *hard constraints*, inte preferenser. Ska döpas om till `teacherId` / `roomId`.

## Exempel-dialog

> **Rektor**: Jag vill att fysik-kurserna ska gå i L3 eller L4.  
> **Utvecklare**: Då sätter du `allowedSubjects: ["fysik"]` på L3 och L4, så blir det en hard constraint i solvern. Det är på *rummets* sida — kursen behöver inte veta något.
>
> **Rektor**: Och min nya lärare är 80%?  
> **Utvecklare**: Då sätter du `servicePoints` på `teacherServiceDistributions` för 2026/2027. Säg att heltid är 600, så blir 80% = 480. Step-funktionen ger då 1 ledig dag. Solvern väljer själv vilken dag som passar bäst.
>
> **Rektor**: Hon vill helst vara ledig på fredagar.  
> **Utvecklare**: Det är inte stött i v1. Step-funktionen ger *antal* lediga dagar, inte *vilken*. Att låta läraren välja dag är v2.
>
> **Rektor**: TE26:s curriculum är på 2510 poäng — varför kan jag inte godkänna det?  
> **Utvecklare**: En curriculum måste summera till exakt 2500. Tio poäng över är troligen en extrakurs någon räknat in fel — ta bort eller flytta till annan klass.
