# Courses JSONB-kolumn: Förklaring

## Vad är JSONB?

**JSONB** (JSON Binary) är en PostgreSQL-datatyp som lagrar JSON-data i binärt format. Det är snabbare och mer effektivt än vanlig JSON eftersom det:
- Indexeras för snabbare sökningar
- Valideras när data läggs till
- Stödjer JSON-frågor och operationer

## Vad lagras i `courses` kolumnen?

`courses` kolumnen i `class_curricula` tabellen lagrar en **array av CourseAssignment objekt**. Varje objekt representerar en kurs som ingår i klassens kursplan.

## CourseAssignment struktur

Varje kurs i arrayen har följande struktur:

```typescript
interface CourseAssignment {
    courseCode: string;           // T.ex. "MATMAT01", "WEBB2000X"
    courseName: string;           // T.ex. "Matematik 1", "Webbutveckling 2"
    points: number;               // Poäng (t.ex. 100, 50, 200)
    category: string;             // En av: 'FOUNDATIONAL_SUBJECTS', 'PROGRAMME_SPECIFIC_SUBJECTS', 
                                  //        'ORIENTATION', 'INDIVIDUAL_CHOICE', 'GYMNASIEARBETE'
    year: 1 | 2 | 3;              // Vilket år kursen går (1, 2 eller 3)
    terms: ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[];  // Array av terminer
}
```

## Exempel på data

```json
[
  {
    "courseCode": "MATMAT01",
    "courseName": "Matematik 1",
    "points": 100,
    "category": "FOUNDATIONAL_SUBJECTS",
    "year": 1,
    "terms": ["term1", "term2"]
  },
  {
    "courseCode": "WEBB2000X",
    "courseName": "Webbutveckling 2",
    "points": 100,
    "category": "ORIENTATION",
    "year": 2,
    "terms": ["term3"]
  },
  {
    "courseCode": "PROG2000X",
    "courseName": "Programmering 2",
    "points": 100,
    "category": "ORIENTATION",
    "year": 2,
    "terms": ["term3", "term4"]
  }
]
```

## Varför JSONB istället för en separat tabell?

**Fördelar med JSONB:**
- ✅ Enkel struktur - alla kurser för en kursplan lagras tillsammans
- ✅ Snabb läsning - hela kursplanen hämtas i en query
- ✅ Atomiska uppdateringar - hela kursplanen uppdateras i en transaktion
- ✅ Flexibel struktur - enkelt att lägga till nya fält utan migration

**Nackdelar:**
- ❌ Svårare att söka/querya specifika kurser över alla klasser
- ❌ Ingen referensintegritet (ingen foreign key till en kurskatalog)
- ❌ Svårare att göra komplexa join-queries

**Varför JSONB valdes här:**
- Kursplanen är en samlad enhet som alltid hämtas som helhet
- Kurser är specifika för varje klass och kursplan (ingen central kurskatalog)
- Strukturen är stabil och ändras sällan
- Prestanda: snabbare att läsa hela kursplanen i en query

## Alternativ: Normaliserad struktur

Om du vill ha en normaliserad struktur med separata tabeller skulle det se ut så här:

```sql
-- Kurskatalog (central)
courses (
  id, course_code, course_name, points
)

-- Kursplaner
class_curricula (
  id, class_id, total_points, is_valid
)

-- Kurser i kursplan
curriculum_courses (
  id, curriculum_id, course_id, category, year
)

-- Terminer för varje kurs i kursplan
course_terms (
  id, curriculum_course_id, term_id
)
```

Men detta skulle kräva fler queries och joins för att hämta en komplett kursplan.

## PostgreSQL JSONB-funktioner

Du kan använda PostgreSQL's inbyggda JSONB-funktioner för att söka i kursplanerna:

```sql
-- Hitta alla kursplaner med en specifik kurskod
SELECT * FROM class_curricula 
WHERE courses @> '[{"courseCode": "MATMAT01"}]'::jsonb;

-- Räkna antal kurser i varje kursplan
SELECT id, jsonb_array_length(courses) as num_courses 
FROM class_curricula;

-- Hämta alla kurser i kategori "ORIENTATION"
SELECT id, jsonb_path_query_array(courses, '$[*] ? (@.category == "ORIENTATION")')
FROM class_curricula;
```

## Sammanfattning

- **Datatyp:** JSONB (PostgreSQL)
- **Innehåll:** Array av CourseAssignment objekt
- **Varje kursplan:** Har en array med alla kurser för klassen
- **Användning:** Lagrar komplett kursplan per klass

