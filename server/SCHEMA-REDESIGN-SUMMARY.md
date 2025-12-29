# Schema-omdesign: Kurser kopplade till klass och lärare

## Översikt

Schemat har omdesignats så att kurser nu är kopplade till både klass och lärare via en ny `course_instances` tabell. `class_curricula` tabellen har tagits bort och metadata har flyttats till `project_classes`.

## Ändringar

### ✅ Ny tabell: `course_instances`

En kurs som ges i en klass med en specifik lärare.

**Fält:**
- `id` - Primary key
- `class_id` - FK till `project_classes`
- `teacher_id` - FK till `teachers` (kan vara NULL om ingen lärare tilldelad än)
- `course_code` - Kurskod (t.ex. "MATMAT01")
- `course_name` - Kursnamn (t.ex. "Matematik 1")
- `points` - Poäng (t.ex. 100)
- `category` - Kategori (FOUNDATIONAL_SUBJECTS, ORIENTATION, etc.)
- `year` - År (1, 2, eller 3)
- `terms` - JSONB array av terminer (t.ex. ["term1", "term2"])
- `created_at`, `updated_at`

**Constraints:**
- Unique constraint på `(class_id, course_code)` - en kurs kan bara ha en lärare per klass
- `teacher_id` kan vara NULL (för kurser som inte har lärare tilldelade än)

### ✅ `project_classes` uppdaterad

**Nya fält:**
- `total_points` - Flyttad från `class_curricula` (default: 0)
- `is_valid` - Flyttad från `class_curricula` (default: 0, 1 om total_points === 2500)

**Borttagna:**
- Inga kurser i JSONB längre - kurser finns nu i `course_instances` tabellen

### ❌ `class_curricula` tabellen tas bort

Tabellen har tagits bort helt. All kursinformation finns nu i `course_instances`.

## Relationer

```
project_classes (1) -> (many) course_instances
teachers (1) -> (many) course_instances
```

## Designbeslut

1. **En kurs ges bara av en lärare** (per klass-instans)
   - Säkerställs av unique constraint på `(class_id, course_code)`

2. **Samma lärare kan undervisa samma kurs i flera klasser**
   - Inga constraints som hindrar detta
   - Exempel: Lärare X kan undervisa Matematik 1 i både klass A och klass B

3. **class_curricula integrerad i project_classes**
   - `total_points` och `is_valid` är nu direkt i `project_classes`
   - Enklare struktur utan extra tabell

## Nästa steg

### 1. Uppdatera API routes och types

Följande filer behöver uppdateras:
- `server/src/routes/projects.ts` - Curriculum endpoints behöver ändras
- `server/src/types/index.ts` - Types behöver uppdateras
- `app/lib/api/types.ts` - Frontend types behöver uppdateras
- `app/lib/api/client.ts` - API client behöver uppdateras

### 2. Skapa migration

Migrationen behöver:
1. Skapa `course_instances` tabell
2. Lägga till `total_points` och `is_valid` till `project_classes`
3. Migrera data från `class_curricula.courses` JSONB till `course_instances` (om det finns data)
4. Ta bort `class_curricula` tabellen

### 3. Uppdatera frontend

- UI för att tilldela lärare till kurser
- Uppdatera kursplaneringsflödet
- Visa vilka lärare som undervisar vilka kurser

## Fördelar med ny design

✅ Normaliserad struktur - enklare att query:a
✅ Stödjer kopplingar till lärare
✅ En kurs kan ha en specifik lärare
✅ En lärare kan undervisa flera kurser
✅ En klass kan ha flera kurser
✅ Enklare att underhålla och utöka

