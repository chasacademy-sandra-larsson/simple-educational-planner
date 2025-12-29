# JSONB vs Normaliserade Tabeller: Förklaring

## Vad är JSONB?

**JSONB** (JSON Binary) är en PostgreSQL-datatyp som lagrar strukturerad JSON-data direkt i en kolumn. Det är **inte** samma sak som att gruppera i separata tabeller, men det kan användas för att lagra relaterad data tillsammans.

## När använder vi JSONB i ditt schema?

### 1. `terms` i `course_instances`
```typescript
terms: jsonb('terms').notNull() // Array: ["term1", "term2", "term3"]
```

**Varför JSONB här?**
- En kurs kan spänna över flera terminer
- Det är en **enkel array** av identifierare
- Data ändras inte ofta (sällan behöver vi söka på "vilka kurser går i term1?")
- Enklare att läsa/skriva hela kursinstansen i en query

**Alternativ (normaliserat):**
```sql
-- Separata tabell
course_instance_terms (
  course_instance_id uuid,
  term_id text,  -- "term1", "term2", etc.
)

-- Kräver JOIN för att få alla terminer för en kurs
SELECT * FROM course_instances ci
JOIN course_instance_terms cit ON ci.id = cit.course_instance_id
WHERE ci.id = '...'
```

### 2. `allowed_subjects` i `rooms`
```typescript
allowedSubjects: jsonb('allowed_subjects') // Array: ["fysik", "kemi", "biologi"]
```

**Varför JSONB här?**
- En sal kan tillåta flera ämnen
- Enklare struktur (är en sal tillgänglig för "fysik"?)
- Data ändras sällan

## JSONB vs Normaliserade Tabeller

### JSONB - När att använda:
✅ **Bra för:**
- Enkla arrays/lists (t.ex. terminer, tags)
- Data som alltid läses/skrivs tillsammans
- Data som ändras sällan
- Flexibel struktur (objekt med olika fält)
- När du inte behöver söka/filtrera på innehållet ofta

### Normaliserade Tabeller - När att använda:
✅ **Bra för:**
- När du behöver söka/filtrera på relationen ofta
- När relationen har egna attribut (t.ex. created_at, weight, etc.)
- När du behöver referera till relationen från andra tabeller
- När relationen är komplex (many-to-many med extra data)

## Exempel från ditt schema

### JSONB: `terms` i `course_instances`
```typescript
// Lagras som: ["term1", "term2"]
// Enkelt att läsa: course.terms = ["term1", "term2"]
// Enkelt att skriva: course.terms = ["term1", "term2", "term3"]
```

**Pro:**
- Enkel struktur
- Snabb att läsa/skriva hela objektet
- Tar mindre plats (inga extra rader i junction-tabell)

**Con:**
- Svårare att söka på "vilka kurser går i term1?" (kräver JSONB-frågor)
- Svårare att ha index på individuella termer
- Ingen referential integrity (kan ha "term99" som inte finns)

### Normaliserat: `service_distribution_courses`
```typescript
// Separata tabell istället för JSONB
serviceDistributionCourses (
  service_distribution_id uuid,
  course_instance_id uuid
)
```

**Varför normaliserat här?**
- Du behöver kunna söka "vilka kurser är i denna tjänstefördelning?"
- Relationen kan ha egna attribut i framtiden (t.ex. priority, notes)
- Unique constraint på (service_distribution_id, course_instance_id)
- Enklare att hantera CASCADE deletes

## Praktiska Skillnader

### Fråga: "Vilka terminer har denna kurs?"

**Med JSONB:**
```sql
SELECT terms FROM course_instances WHERE id = '...';
-- Returnerar: ["term1", "term2"]
-- Behöver parsa JSON i applikationen
```

**Med Normaliserad:**
```sql
SELECT term_id FROM course_instance_terms 
WHERE course_instance_id = '...';
-- Returnerar rader: term1, term2
-- Enklare att hantera i databas
```

### Fråga: "Vilka kurser går i term1?"

**Med JSONB:**
```sql
SELECT * FROM course_instances 
WHERE terms @> '["term1"]';  -- JSONB-contains operator
-- Fungerar, men långsammare utan index
```

**Med Normaliserad:**
```sql
SELECT ci.* FROM course_instances ci
JOIN course_instance_terms cit ON ci.id = cit.course_instance_id
WHERE cit.term_id = 'term1';
-- Enklare, snabbare med index
```

## Rekommendation för ditt schema

### Behåll JSONB för:
1. ✅ `terms` i `course_instances` - Enkel array, ändras sällan
2. ✅ `allowed_subjects` i `rooms` - Enkel array, ändras sällan

### Överväg normalisering om:
- Du behöver ofta söka "vilka kurser går i term X?"
- Du behöver lägga till extra attribut till relationen
- Du behöver referera till relationen från andra tabeller

## Sammanfattning

**JSONB är INTE samma sak som att gruppera i separata tabeller**, men det kan användas för att:
- Lagra enkla arrays/lists tillsammans med huvudobjektet
- Minska antal JOINs i vissa queries
- Förenkla data som alltid läses/skrivs tillsammans

**Normaliserade tabeller** är bättre när du behöver:
- Söka/filtrera på relationen ofta
- Ha extra attribut på relationen
- Referential integrity

I ditt schema är användningen av JSONB väl vald för `terms` och `allowed_subjects` eftersom det är enkla arrays som ändras sällan och läses tillsammans med huvudobjektet.

