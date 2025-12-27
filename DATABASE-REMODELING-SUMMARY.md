# Databas Ommodellering - Sammanfattning

## Översikt
Databasen har ommodellerats så att `project_programs` tabellen har tagits bort och program-information lagras nu direkt på `project_classes`.

## Ändringar

### ✅ Schema Ändringar (server/src/db/schema.ts)
- **Tagen bort**: `projectPrograms` tabell
- **Uppdaterad**: `projectClasses` tabell har nu följande nya kolumner:
  - `programCode` (text)
  - `programName` (text)
  - `orientationCode` (text)
  - `orientationName` (text)
- **Tagen bort**: `programId` foreign key från `projectClasses`
- **Uppdaterade relations**: Ta bort `projectProgramsRelations` och uppdatera `projectClassesRelations`

### ✅ Backend API Ändringar
- **server/src/routes/projects.ts**:
  - Tagit bort `POST /:id/programs` endpoint
  - Uppdaterat `POST /:id/classes` för att acceptera program-info direkt i request body
  - Uppdaterat `GET /:id` för att inte längre inkludera `programs` relation

### ✅ Backend Scripts
- **server/src/db/seed.ts**: Uppdaterat för att lägga program-info direkt på klasser
- **server/src/db/view-data.ts**: Uppdaterat för att använda program-fält direkt från klasser
- **server/src/types/index.ts**: Tagit bort `CreateProgramRequest` interface

### ✅ Frontend Types
- **app/lib/api/types.ts**:
  - Tagit bort `ProjectProgram` interface
  - Uppdaterat `ProjectClass` interface med program-fält direkt
  - Uppdaterat `ProjectWithDetails` för att ta bort `programs` array

### ✅ Frontend API Client
- **app/lib/api/client.ts**: Tagit bort `addProgram` metod

### ✅ Frontend Komponenter
- **app/projects/[id]/page.tsx**: Uppdaterat för att använda `cls.programCode`, `cls.programName`, etc. istället för `cls.program.*`
- **app/api/db/view/route.ts**: Uppdaterat för att inte längre referera till program relation

## ⚠️ Nästa Steg

### 1. Skapa Migration
Du behöver skapa en migration för att:
1. Lägga till nya kolumner i `project_classes`:
   - `program_code` (text, not null)
   - `program_name` (text, not null)
   - `orientation_code` (text, not null)
   - `orientation_name` (text, not null)

2. Migrera befintlig data (om du har data i databasen):
   - Kopiera program-info från `project_programs` till `project_classes` via `program_id`

3. Ta bort gamla kolumner:
   - Ta bort `program_id` foreign key constraint
   - Ta bort `program_id` kolumn från `project_classes`

4. Ta bort `project_programs` tabell

**Kommandon:**
```bash
cd server
npm run db:generate  # Generera migration från schema
npm run db:migrate   # Kör migration (kontrollera först!)
```

### 2. Generera Nytt ERD
```bash
cd server
npm run erd
```

### 3. Testa
- Testa att skapa en ny klass med program-info
- Verifiera att data sparas korrekt
- Kontrollera att frontend visar program-info korrekt

## Viktigt
⚠️ **Se till att migrera befintlig data innan du tar bort `project_programs` tabellen om du har data i databasen!**

