# Schema-uppdateringar: Klart! ✅

## Gjorda ändringar

### 1. Unique constraint: En klass kan bara ha EN kursplan ✅
- `classCurricula.classId` är nu `unique()`
- Relationen ändrad från `curricula: many(classCurricula)` till `curriculum: one(classCurricula)`

### 2. Unique constraint: Klassnamn måste vara unika per projekt ✅
- Composite unique constraint på `(projectId, classCode)`
- Säkerställer att samma klasskod inte kan användas två gånger inom samma projekt

### 3. Uppdaterad kod ✅
- ✅ `schema.ts` - Constraints tillagda
- ✅ `schema.dbml` - Uppdaterad med constraints
- ✅ `server/src/routes/projects.ts` - Relation uppdaterad (`curriculum: true`)
- ✅ `server/src/db/view-data.ts` - Kod uppdaterad för `curriculum` (one) istället för `curricula` (many)
- ✅ `app/api/db/view/route.ts` - Uppdaterad
- ✅ `app/lib/api/types.ts` - Type uppdaterad (`curriculum?: ClassCurriculum`)
- ✅ `app/projects/[id]/page.tsx` - Alla referenser uppdaterade från `curricula[0]` till `curriculum`

## Nästa steg: Generera och köra migration

**IMPORTANT:** Du behöver generera och köra en migration för att applicera ändringarna på databasen:

```bash
cd server
npm run db:generate  # Generera migration (kan visa deprecated warning, det är OK)
npm run db:migrate   # Kör migrationen
```

**Observera:** Om du har befintlig data i databasen:
- Om det finns klasser med flera kursplaner kommer migrationen att misslyckas
- Du måste först ta bort duplicerade kursplaner (håll bara en per klass)

**Kontrollera innan migration:**
```bash
# Kolla om det finns klasser med flera kursplaner
cd server
npm run db:view
```

Om du ser klasser med flera kursplaner, ta bort de extra kursplanerna först.

## Vad migrationen kommer att göra

1. Lägga till `UNIQUE` constraint på `class_curricula.class_id`
2. Lägga till composite `UNIQUE` constraint på `(project_id, class_code)` i `project_classes`

## Schema-struktur efter ändringar

```
project_classes
  ├── id (pk)
  ├── project_id (fk) ──┐
  ├── class_code ───────┼── UNIQUE(project_id, class_code)
  └── ... (other fields)

class_curricula
  ├── id (pk)
  ├── class_id (fk, UNIQUE) ──► project_classes.id (1:1 relation)
  └── ... (other fields)
```

## Relationer

**Före:**
- `projectClasses.curricula: many(classCurricula)` - En klass kunde ha flera kursplaner

**Efter:**
- `projectClasses.curriculum: one(classCurricula)` - En klass kan bara ha EN kursplan

