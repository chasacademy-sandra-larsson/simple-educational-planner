# Salar (Rooms) Schema: Sammanfattning

## Implementerade ändringar

### 1. Uppdaterad `rooms` tabell ✅

**Nya fält:**
- `capacity` - Nu **NOT NULL** (krävs)
- `allowedSubjects` - JSONB array för ämnesbegränsningar (nullable)

**Constraints:**
- Unique constraint på `(project_id, room_number)` - unikt namn per projekt

**Exempel på `allowedSubjects`:**
```json
["fysik", "kemi", "biologi"]
```

Om `allowedSubjects` är `NULL` = inga begränsningar (salen kan ta alla ämnen)

### 2. Uppdaterad `course_instances` tabell ✅

**Nytt fält:**
- `roomId` - FK till `rooms.id` (nullable)

**Användning:**
- En kursinstans kan ha en sal tilldelad
- `room_id` kan vara NULL om ingen sal är tilldelad än

### 3. Relations uppdaterade ✅

```
rooms (1) -> (many) course_instances
course_instances (many) -> (one) rooms
```

## Schema-struktur

```
rooms
  ├── id (pk)
  ├── project_id (fk)
  ├── room_number (unique per project)
  ├── room_type (t.ex. "lab", "classroom")
  ├── capacity (NOT NULL)
  ├── allowed_subjects (JSONB array, nullable)
  └── notes

course_instances
  ├── ... (existing fields)
  ├── room_id (fk -> rooms.id, nullable)
  └── ...
```

## Exempel

### Sal utan begränsningar
```json
{
  "room_number": "Klassrum 101",
  "capacity": 30,
  "allowed_subjects": null
}
```

### Labbsal med begränsningar
```json
{
  "room_number": "Labbsal A",
  "room_type": "lab",
  "capacity": 24,
  "allowed_subjects": ["fysik", "kemi", "biologi"]
}
```

### Kursinstans med sal
```json
{
  "course_code": "KEMKEM01",
  "course_name": "Kemi 1",
  "room_id": "uuid-of-labbsal-a",
  ...
}
```

## Validering

När en kursinstans tilldelas en sal bör systemet validera:
- Om salen har `allowed_subjects`, kontrollera att kursens ämne finns i listan
- Om salen har kapacitet, kontrollera att antal studenter inte överstiger kapaciteten

## Nästa steg

- Uppdatera API routes för att stödja room assignments
- Uppdatera frontend för att visa och tilldela salar
- Implementera validering för ämnesbegränsningar

