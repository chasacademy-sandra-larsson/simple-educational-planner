# Implementation: Terms Array för Kurser

## Översikt
Kurser kan nu gå över flera terminer. Implementationen stödjer både `term` (bakåtkompatibilitet) och `terms` array.

## Ändringar

### 1. Types Uppdaterade

**app/lib/api/types.ts & server/src/types/index.ts:**
```typescript
export interface CourseAssignment {
    courseCode: string;
    courseName: string;
    points: number;
    category: string;
    year: 1 | 2 | 3;
    terms: ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[]; // NY!
}
```

**app/components/comprehensive-course-planner.tsx:**
```typescript
interface CourseWithTerm {
    courseCode: string;
    courseName: string;
    points: number;
    category: string;
    term?: TermId; // Bakåtkompatibilitet
    terms?: TermId[]; // NY - prefererad väg
    level?: string;
}
```

### 2. Spar-logik Uppdaterad

`handleSave` funktionen:
- Konverterar `course.term` eller `course.terms` till `terms` array
- Hanterar både `year` och `term` värden
- Sparar `terms` array i databasen

### 3. Beräkningsfunktioner Uppdaterade

- **`getPointsByTerm`**: Kontrollerar `terms` array först, fallback till `term`
- **`getCoursesByTerm`**: Kontrollerar `terms` array först, fallback till `term`

### 4. UI-hantering

- När kurser skapas sätts både `term` och `terms`
- `handleTermChange` uppdaterar både `term` och `terms`

## Bakåtkompatibilitet

Koden är bakåtkompatibel:
- Kurser med bara `term` fungerar fortfarande
- Gamla kurser utan `terms` array hanteras korrekt
- `terms` array används när den finns, annars fallback till `term`

## Nästa Steg (Optional)

För att fullt utnyttja multi-term funktionalitet:
1. Uppdatera UI för att tillåta val av flera terminer (t.ex. checkboxes)
2. Lägg till logik för att ladda befintlig curriculum och konvertera till `terms` format

## Exempel

**En kurs som går över två terminer:**
```json
{
  "courseCode": "MATH100",
  "courseName": "Matematik 1",
  "points": 100,
  "category": "FOUNDATIONAL_SUBJECTS",
  "year": 1,
  "terms": ["term1", "term2"]
}
```

**En kurs på en termin:**
```json
{
  "courseCode": "ENG100",
  "courseName": "Engelska 1",
  "points": 100,
  "category": "FOUNDATIONAL_SUBJECTS",
  "year": 1,
  "terms": ["term1"]
}
```

