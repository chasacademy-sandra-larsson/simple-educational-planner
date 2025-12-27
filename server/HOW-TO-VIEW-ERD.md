# Så här visar du ditt ERD med VS Code Extension

## Installera DBML Extension

1. Öppna Extensions i VS Code:
   - `Cmd+Shift+X` (Mac) eller `Ctrl+Shift+X` (Windows/Linux)
   - Eller klicka på Extensions-ikonen i sidopanelen

2. Sök efter en av dessa extensions:
   - **"DBML"** - Enkel och populär
   - **"DB Schema Visualizer"** - Mer funktioner, stödjer DBML

3. Installera extensionen

## Visa ditt ERD

1. Öppna filen `server/schema.dbml` i VS Code

2. För att visa diagrammet:
   - **Högerklicka** på filen → Välj "Open Preview" eller "Show DBML Preview"
   - Eller: Klicka på **Preview-knappen** som visas uppe till höger när .dbml-filen är öppen
   - Eller: Tryck `Cmd+Shift+V` (Mac) / `Ctrl+Shift+V` (Windows/Linux)

3. Diagrammet visas i en preview-panel bredvid din kod

## Om extensionen inte fungerar

Om du inte ser preview-funktionen:
- Kontrollera att extensionen är aktiverad
- Starta om VS Code
- Prova att högerklicka på filen och leta efter "Open With..." alternativ

## Alternativ: dbdiagram.io (Online)

Om extensionen inte fungerar, kan du alltid använda:
1. Gå till https://dbdiagram.io
2. Klistra in innehållet från `server/schema.dbml`
3. Diagrammet visas direkt i webbläsaren

