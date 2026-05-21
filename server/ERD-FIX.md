# ERD Script Fix

## Problem

`drizzle-dbml-generator` stödjer inte `unique` constraints som är definierade i `extraConfig` (det andra argumentet till `pgTable`). Detta orsakar felet:

```
TypeError: b?.build is not a function
```

## Lösning

Jag har skapat två alternativ:

### 1. Manuell DBML-generator (Rekommenderat)

Använd `dbml-manual.ts` som skapar DBML-filen manuellt med alla constraints:

```bash
npm run erd
```

Detta script genererar `schema.dbml` med:
- ✅ Unique constraint på `class_curricula.class_id`
- ✅ Composite unique constraint på `(project_id, class_code)` i `project_classes`

### 2. Uppdaterad schema.dbml

Jag har också uppdaterat `schema.dbml` manuellt med korrekt syntax:

```dbml
table project_classes {
  // ... columns ...
  
  indexes {
    (project_id, class_code) [unique, name: 'unique_class_code_per_project']
  }
}
```

## Användning

**För att generera ERD:**
```bash
cd server
npm run erd
```

**För att visa ERD:**
- Öppna `schema.dbml` i dbdiagram.io
- Eller använd VS Code extension för DBML

## Notering

Om du uppdaterar `schema.ts` och behöver regenerera DBML:
1. Kör `npm run erd` (använder manuell generator)
2. Eller uppdatera `schema.dbml` manuellt om det behövs

## Framtida förbättring

När `drizzle-dbml-generator` får stöd för unique constraints i extraConfig kan du byta tillbaka till automatisk generering genom att ändra `package.json`:

```json
"erd": "tsx src/db/dbml.ts"
```

