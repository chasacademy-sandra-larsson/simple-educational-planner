# Förslag: Kursdesign - Kurser kopplade till klass och lärare

## Nuvarande design

**Problem:**
- Kurser lagras som JSONB array i `class_curricula.courses`
- Inga kopplingar till lärare
- Svårt att spåra vilken lärare som undervisar vilken kurs

## Förslag på ny design

### Ny tabell: `course_instances` eller `class_courses`

En kurs som ges i en klass med en specifik lärare.

```
course_instances (
  id uuid [pk]
  class_id uuid [fk -> project_classes.id]
  teacher_id uuid [fk -> teachers.id]
  course_code string
  course_name string
  points integer
  category enum
  year integer (1, 2, 3)
  terms jsonb (array av terminer)
  created_at timestamp
  updated_at timestamp
)
```

### Relationer

```
project_classes (1) -> (many) course_instances
teachers (1) -> (many) course_instances
```

### Fördelar

✅ En kurs kan ha en specifik lärare
✅ En lärare kan undervisa flera kurser
✅ En klass kan ha flera kurser
✅ Enkel att query:a (t.ex. "vilka kurser undervisar lärare X?")
✅ Normaliserad struktur

### Frågor att ställa

1. **Kan samma kurs ges av flera lärare?**
   - T.ex. Matematik 1 ges av 2 olika lärare i samma klass?
   - Om ja: varje instans har sin egen lärare
   - Om nej: unique constraint på (class_id, course_code)?

2. **Kan en lärare undervisa samma kurs i flera klasser?**
   - T.ex. Lärare X undervisar Matematik 1 i både klass A och klass B?
   - Om ja: multiple rows (en per klass)
   - Om nej: unique constraint på (teacher_id, course_code, class_id)?

3. **Behåller vi `class_curricula` tabellen?**
   - Om kurser nu är i `course_instances`, vad används `class_curricula` för?
   - Alternativ: Ta bort `class_curricula` helt och hålla bara `course_instances`
   - Alternativ: Behålla `class_curricula` för metadata (total_points, is_valid) och referera till `course_instances`

4. **Hur hanterar vi kursplanering?**
   - Är `course_instances` resultatet av kursplanering (dvs. läraren är tilldelad)?
   - Eller behöver vi en separat planeringsfas där kurser kan vara planerade men inte tilldelade lärare än?

## Förslag på implementering

### Alternativ A: Ersätt `class_curricula.courses` med `course_instances`

```sql
-- Ta bort courses JSONB från class_curricula
-- Skapa ny tabell course_instances

CREATE TABLE course_instances (
  id uuid PRIMARY KEY,
  class_id uuid REFERENCES project_classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  course_code text NOT NULL,
  course_name text NOT NULL,
  points integer NOT NULL,
  category text NOT NULL,
  year integer NOT NULL CHECK (year IN (1, 2, 3)),
  terms jsonb NOT NULL, -- array av terminer
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Index för snabba queries
CREATE INDEX idx_course_instances_class ON course_instances(class_id);
CREATE INDEX idx_course_instances_teacher ON course_instances(teacher_id);
```

### Alternativ B: Behåll `class_curricula` för metadata

```sql
-- class_curricula behålls men courses JSONB tas bort
-- course_instances länkar till class_curricula.id

CREATE TABLE course_instances (
  id uuid PRIMARY KEY,
  curriculum_id uuid REFERENCES class_curricula(id) ON DELETE CASCADE,
  class_id uuid REFERENCES project_classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  -- ... resten samma som ovan
);
```

## Rekommendation

**Jag rekommenderar Alternativ A** - ersätt JSONB med normaliserad tabell.

**Anledningar:**
- Enklare struktur
- Bättre query-prestanda
- Stödjer kopplingar till lärare
- Enklare att underhålla och utöka

**`class_curricula` kan behållas för:**
- Metadata (total_points, is_valid)
- Eller tas bort helt om inte nödvändigt

