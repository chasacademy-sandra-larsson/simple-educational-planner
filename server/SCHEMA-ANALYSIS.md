# Schema-analys: Stämmer designen?

## Användarens krav

1. ✅ **Ett projekt kan ha flera klasser**
2. ✅ **Varje klass har ett klassnamn och en kursplan som har programnamn, kod, orientering, startår och slutår**
3. ✅ **En kursplan är kopplad till en klass**
4. ✅ **Kursplanen innehåller alla kurser som väljs inom programfördjupning och vad som är möjligt att välja till individuellt val**
5. ✅ **Kursplanen anger i vilken eller vilka terminer en kurs ska ligga**

## Verklig implementation

### 1. Projekt kan ha flera klasser ✅
```typescript
projects (1) -> (many) projectClasses
```
- Relation: `projectsRelations.classes: many(projectClasses)` ✅
- Foreign key: `projectClasses.projectId` → `projects.id` ✅

### 2. Klass har klassnamn + programinfo + kursplan ✅
**Klassnamn och programinfo i `projectClasses`:**
- ✅ `classCode` - klassnamn (t.ex. "26TEKA")
- ✅ `programName` - programnamn (t.ex. "Teknikprogrammet")
- ✅ `programCode` - programkod (t.ex. "TE")
- ✅ `orientationCode` - orienteringskod (t.ex. "TEKTEK")
- ✅ `orientationName` - orienteringsnamn (t.ex. "Teknik")
- ✅ `startYear` - startår (t.ex. 2026)
- ✅ `graduationYear` - slutår (t.ex. 2029)

**Kursplan i `classCurricula`:**
- Kopplad via `classId` → `projectClasses.id` ✅

### 3. Kursplan är kopplad till klass ✅
```typescript
classCurricula (many) -> (1) projectClasses
```
- Foreign key: `classCurricula.classId` → `projectClasses.id` ✅
- Relation: `classCurriculaRelations.class: one(projectClasses)` ✅
- Relation: `projectClassesRelations.curricula: many(classCurricula)` ✅

### 4. Kursplanen innehåller programfördjupning och individuellt val ✅
**Struktur:**
- `classCurricula.courses` - JSONB kolumn som innehåller array av `CourseAssignment` objekt ✅

**CourseAssignment innehåller:**
```typescript
{
  courseCode: string;
  courseName: string;
  points: number;
  category: 'FOUNDATIONAL_SUBJECTS' | 'PROGRAMME_SPECIFIC_SUBJECTS' | 
            'ORIENTATION' | 'INDIVIDUAL_CHOICE' | 'GYMNASIEARBETE';
  year: 1 | 2 | 3;
  terms: ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[];
}
```

- ✅ `category: 'ORIENTATION'` - programfördjupning
- ✅ `category: 'INDIVIDUAL_CHOICE'` - individuellt val
- ✅ Kursplanen kan innehålla alla typer av kurser (inkl. programfördjupning och individuellt val)

### 5. Kursplanen anger i vilken eller vilka terminer en kurs ska ligga ✅
- ✅ `CourseAssignment.terms` är en **array** av terminer: `("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[]`
- ✅ Stödjer kurser som spänner över flera terminer (t.ex. `["term1", "term2"]`)
- ✅ Stödjer kurser som bara går på en termin (t.ex. `["term3"]`)

## Slutsats

✅ **Schemat är korrekt designat** enligt alla krav!

Alla fem krav är implementerade korrekt:
- Projekt → Klasser relation ✅
- Klass innehåller klassnamn + programinfo ✅
- Kursplan är kopplad till klass ✅
- Kursplan kan innehålla programfördjupning och individuellt val ✅
- Kursplan anger i vilken/vilka terminer kurser ligger ✅

## Tabellstruktur

```
users
  └── projects (1:many)
        ├── project_classes (1:many)
        │     └── class_curricula (1:many)
        │           └── courses (JSONB array av CourseAssignment)
        ├── teachers (1:many)
        └── rooms (1:many)
```

## Eventuella förbättringar (valfria)

1. **Unik constraint på kursplan per klass?** 
   - För närvarande kan en klass teoretiskt ha flera kursplaner (relationen är `many`). 
   - Om en klass bara ska ha EN kursplan, kan man lägga till en unik constraint på `classId` i `classCurricula`.
   - **Rekommendation:** Om det behövs, lägg till `unique()` constraint.

2. **Indexering på JSONB för bättre prestanda?**
   - Om man ofta söker efter specifika kurser eller kategorier, kan GIN-index hjälpa.
   - **Rekommendation:** Lägg till index om nödvändigt baserat på faktisk användning.

