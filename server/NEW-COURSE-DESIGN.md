# Ny kursdesign: Implementation Plan

## Designbeslut

1. ✅ **En kurs ges bara av en lärare** (per klass-instans)
   - Unique constraint på `(class_id, course_code)` i `course_instances`

2. ✅ **Samma lärare kan undervisa samma kurs i flera klasser**
   - Inga constraints som hindrar detta

3. ✅ **class_curricula integreras i project_classes**
   - `total_points` och `is_valid` flyttas till `project_classes`
   - `class_curricula` tabellen tas bort

## Ny struktur

### course_instances (NY TABELL)

```
course_instances (
  id uuid [pk]
  class_id uuid [fk -> project_classes.id, on delete cascade]
  teacher_id uuid [fk -> teachers.id, on delete set null]  // NULL om ingen lärare tilldelad än
  course_code text [not null]
  course_name text [not null]
  points integer [not null]
  category text [not null]  // FOUNDATIONAL_SUBJECTS, ORIENTATION, etc.
  year integer [not null, check: 1-3]
  terms jsonb [not null]  // Array: ["term1", "term2"]
  created_at timestamp
  updated_at timestamp
  
  unique: (class_id, course_code)  // En kurs kan bara ha en lärare per klass
)
```

### project_classes (UPPDATERAD)

```
project_classes (
  ... existing fields ...
  total_points integer [default 0]  // FLYTTAD från class_curricula
  is_valid integer [default 0]      // FLYTTAD från class_curricula (1 om total_points === 2500)
  // courses JSONB TAS BORT
)
```

### class_curricula (TAS BORT)

```
❌ class_curricula tabellen tas bort helt
```

## Relationer

```
project_classes (1) -> (many) course_instances
teachers (1) -> (many) course_instances
```

## Migration Steps

1. Skapa `course_instances` tabell
2. Migrera data från `class_curricula.courses` JSONB till `course_instances` (om det finns data)
3. Lägg till `total_points` och `is_valid` till `project_classes`
4. Ta bort `class_curricula` tabellen
5. Uppdatera alla queries och API endpoints

