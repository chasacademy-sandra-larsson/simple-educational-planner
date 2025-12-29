# Schema: Vad behöver göras klart?

## Aktuell status

Schemat är funktionellt men kan behöva förbättras med constraints och indexering.

## Möjliga förbättringar

### 1. Unique constraint: En klass ska bara ha en kursplan ⚠️

**Nuvarande situation:**
- `classCurricula.classId` har INGEN unique constraint
- En klass kan teoretiskt ha flera kursplaner

**Förslag:**
```typescript
classId: uuid('class_id')
    .references(() => projectClasses.id, { onDelete: 'cascade' })
    .notNull()
    .unique()  // Lägg till detta
```

**Vill du att en klass bara ska kunna ha EN kursplan?** (J/N)

---

### 2. Unique constraint: Klassnamn ska vara unika inom ett projekt ⚠️

**Nuvarande situation:**
- `projectClasses.classCode` har INGEN unique constraint
- Två klasser i samma projekt kan ha samma klasskod

**Förslag:**
```typescript
// Composite unique constraint på (projectId, classCode)
.unique({ columns: [projectClasses.projectId, projectClasses.classCode] })
```

**Vill du att klassnamn ska vara unika per projekt?** (J/N)

---

### 3. Indexering för bättre prestanda (valfritt)

**Förslag på index:**
- Index på `projectClasses.projectId` (för vanliga queries)
- Index på `classCurricula.classId` (för vanliga queries)
- GIN index på `classCurricula.courses` (om man söker i JSONB ofta)

**Vill du ha indexering?** (J/N)

---

### 4. Kontrollera att DBML-filen är uppdaterad

DBML-filen ska matcha schema.ts. Kontrollera om den behöver uppdateras med:
- Unique constraints
- Index definitions

---

## Frågor till dig

1. **Ska en klass bara kunna ha EN kursplan?** (Rekommenderat: JA)
2. **Ska klassnamn vara unika per projekt?** (Rekommenderat: JA)
3. **Behöver du indexering nu, eller kan det vänta?** (Rekommenderat: Kan vänta)

## Nästa steg

Efter dina svar kan jag:
1. Uppdatera `schema.ts` med constraints
2. Skapa migration för ändringarna
3. Uppdatera `schema.dbml` för att matcha
4. Testa att migrationen fungerar

