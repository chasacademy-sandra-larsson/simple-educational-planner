# Så här ser du din databas

## Alternativ 1: Drizzle Studio (Rekommenderat - Grafiskt gränssnitt)

```bash
cd server
npm run db:studio
```

Detta öppnar ett webbgränssnitt (vanligtvis http://localhost:4983) där du kan:
- Se alla tabeller
- Bläddra i data
- Redigera data
- Köra SQL-queries

## Alternativ 2: Projektets View Script

```bash
cd server
npm run db:view
```

Detta visar all data formaterad i terminalen med alla projekt, klasser och kursplaner.

## Alternativ 3: psql (PostgreSQL Command Line)

### Anslut till databasen:
```bash
psql postgresql://sandralatsson@localhost:5432/educational_planner
```

Om du behöver lösenord:
```bash
psql -h localhost -U sandralatsson -d educational_planner
```

### När du är inne i psql:

**Lista alla tabeller:**
```sql
\dt
```

**Se alla tabeller med mer info:**
```sql
\dt+
```

**Lista alla databaser:**
```sql
\l
```

**Se schema för en tabell:**
```sql
\d users
\d projects
\d project_classes
\d project_programs
\d class_curricula
```

**Se all data från en tabell:**
```sql
-- Alla användare
SELECT * FROM users;

-- Alla projekt
SELECT * FROM projects;

-- Alla klasser
SELECT * FROM project_classes;

-- Alla program
SELECT * FROM project_programs;

-- Alla kursplaner
SELECT * FROM class_curricula;
```

**Se tabellstruktur:**
```sql
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

**Räkna rader i varje tabell:**
```sql
SELECT 
    'users' as tabell, COUNT(*) as antal FROM users
UNION ALL
SELECT 
    'projects', COUNT(*) FROM projects
UNION ALL
SELECT 
    'project_classes', COUNT(*) FROM project_classes
UNION ALL
SELECT 
    'project_programs', COUNT(*) FROM project_programs
UNION ALL
SELECT 
    'class_curricula', COUNT(*) FROM class_curricula;
```

**Avsluta psql:**
```sql
\q
```

## Alternativ 4: SQL-frågor för specifik data

### Se alla klasser med sina program:
```sql
SELECT 
    pc.class_code,
    pc.start_year,
    pc.graduation_year,
    pp.program_name,
    pp.program_code,
    p.name as project_name
FROM project_classes pc
JOIN project_programs pp ON pc.program_id = pp.id
JOIN projects p ON pc.project_id = p.id
ORDER BY pc.start_year, pc.class_code;
```

### Se alla kursplaner med antal kurser:
```sql
SELECT 
    pc.class_code,
    cc.total_points,
    cc.is_valid,
    jsonb_array_length(cc.courses) as antal_kurser,
    cc.updated_at
FROM class_curricula cc
JOIN project_classes pc ON cc.class_id = pc.id
ORDER BY pc.class_code;
```

### Se alla projekt med antal klasser:
```sql
SELECT 
    p.name,
    p.description,
    COUNT(pc.id) as antal_klasser,
    p.created_at
FROM projects p
LEFT JOIN project_classes pc ON p.id = pc.project_id
GROUP BY p.id, p.name, p.description, p.created_at
ORDER BY p.created_at DESC;
```

