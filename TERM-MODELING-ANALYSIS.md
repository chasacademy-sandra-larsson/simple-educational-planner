# Analys: Hur kurser modelleras över terminer

## Nuvarande Situation

### UI-nivå (Frontend)
- `CourseWithTerm` interface har: `term?: TermId` (en enda termin)
- En kurs kan bara tilldelas till EN termin åt gången i UI:t

### Databas-nivå (Backend)
- `CourseAssignment` har: `year: 1 | 2 | 3` (bara året)
- Ingen termininformation lagras alls!

## Problem

1. **En kurs kan gå över flera terminer** (t.ex. en kurs på 100p kan sprida över term1 och term2)
2. Nuvarande modell stödjer bara EN termin per kurs
3. Databasen förlorar ALL termininformation vid sparande

## Förslag på Lösning

### Alternativ 1: Array av terminer per kurs
```typescript
interface CourseAssignment {
    courseCode: string;
    courseName: string;
    points: number;
    category: string;
    year: 1 | 2 | 3;
    terms: ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[]; // Array!
}
```

**Exempel:**
```json
{
  "courseCode": "MATH100",
  "courseName": "Matematik 1",
  "points": 100,
  "category": "FOUNDATIONAL_SUBJECTS",
  "year": 1,
  "terms": ["term1", "term2"]  // Kursen går över två terminer
}
```

### Alternativ 2: Split points per termin
Om en kurs delar upp poäng över terminer:
```typescript
interface CourseAssignment {
    courseCode: string;
    courseName: string;
    category: string;
    termAssignments: {
        term: "term1" | "term2" | "term3" | "term4" | "term5" | "term6";
        points: number;  // Poäng för denna termin
    }[];
}
```

**Exempel:**
```json
{
  "courseCode": "MATH100",
  "courseName": "Matematik 1",
  "category": "FOUNDATIONAL_SUBJECTS",
  "termAssignments": [
    { "term": "term1", "points": 50 },
    { "term": "term2", "points": 50 }
  ]
}
```

### Alternativ 3: Separata kursinstanser per termin
Om en kurs delas upp i separata delar:
```typescript
interface CourseAssignment {
    courseCode: string;
    courseName: string;
    category: string;
    term: "term1" | "term2" | "term3" | "term4" | "term5" | "term6";
    points: number;
    partOfCourse?: string; // Original courseCode om detta är en del av en större kurs
}
```

## Rekommendation

**Alternativ 1** är enklast och mest flexibel:
- Enkel att implementera
- Stödjer både kurser på en termin och flera terminer
- Behöver uppdatera UI för att hantera flera terminer (checkboxes eller multi-select)

## Nästa Steg

1. Uppdatera `CourseAssignment` interface för att inkludera `terms: string[]`
2. Uppdatera UI för att tillåta val av flera terminer
3. Uppdatera spar-logiken för att lagra term-array
4. Uppdatera laddnings-logiken för att återställa term-array

