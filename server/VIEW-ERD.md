# Så här ser du ditt ERD-diagram

## ERD-filen
Din ERD finns i: `server/schema.dbml`

## Alternativ för att visa ERD

### 1. dbdiagram.io (Rekommenderat - Online)

1. Öppna https://dbdiagram.io i din webbläsare
2. Klistra in innehållet från `server/schema.dbml`
3. Diagrammet visas automatiskt!

Du kan också:
- Ladda upp filen direkt
- Exportera som PNG, PDF eller SQL
- Redigera och dela diagrammet

### 2. VS Code med DBML Extension (Rekommenderat om du använder VS Code)

**Installera extension:**
1. Öppna VS Code Extensions (Cmd+Shift+X eller Ctrl+Shift+X)
2. Sök efter "DBML" eller "DB Schema Visualizer"
3. Installera extensionen

**Vanliga DBML-extensions:**
- **"DBML"** - Den mest populära DBML-extensionen
- **"DB Schema Visualizer"** - Stödjer DBML-filer och visar ER-diagram

**Använd extensionen:**
1. Öppna `server/schema.dbml` i VS Code
2. Högerklicka på filen och välj "Open Preview" eller "Show DBML Preview"
3. Alternativt: Tryck på Preview-knappen i VS Code (vanligtvis synlig när du har en .dbml-fil öppen)
4. Diagrammet visas i en preview-panel i VS Code

### 3. Generera om ERD

Om du har ändrat schema och vill generera om ERD:

```bash
cd server
npm run erd
```

Detta genererar `schema.dbml` från ditt Drizzle schema.

### 4. Automatisk generering vid ändringar

För att automatiskt generera ERD när du ändrar schema:

```bash
cd server
npm run erd:watch
```

Detta körs i bakgrunden och genererar om ERD när `src/db/schema.ts` ändras.

## Din nuvarande ERD-struktur

ERD:et visar dessa tabeller och relationer:

- **users** → **projects** (en användare kan ha många projekt)
- **projects** → **project_programs** (ett projekt kan ha många program)
- **projects** → **project_classes** (ett projekt kan ha många klasser)
- **project_programs** → **project_classes** (ett program kan ha många klasser)
- **project_classes** → **class_curricula** (en klass kan ha kursplaner)
- **projects** → **rooms** (ett projekt kan ha många rum)
- **projects** → **teachers** (ett projekt kan ha många lärare)

