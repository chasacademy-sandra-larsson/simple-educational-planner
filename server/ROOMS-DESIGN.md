# Salar (Rooms) Design

## Krav

1. Koppla salar till kursinstanser (course_instances)
2. Salar ska ha ett unikt namn (per projekt)
3. Salar ska ha en kapacitet
4. En sal kan ha constraint för vilka ämnen den kan ta (t.ex. labbsal för fysik, kemi, biologi)

## Designförslag

### Uppdatera `rooms` tabellen

```
rooms (
  id uuid [pk]
  project_id uuid [fk -> projects.id]
  room_number text [not null]  // Unikt namn (t.ex. "Labbsal A", "Klassrum 101")
  room_type text  // T.ex. "lab", "classroom", "gym"
  capacity integer  // Redan finns, behöver göras NOT NULL?
  allowed_subjects jsonb  // Array av ämnen som salen kan ta (t.ex. ["fysik", "kemi", "biologi"])
  notes text
  created_at timestamp
  
  unique: (project_id, room_number)  // Unikt namn per projekt
)
```

### Koppla salar till kursinstanser

Alternativ A: Direkt koppling i course_instances
```
course_instances (
  ...
  room_id uuid [fk -> rooms.id, nullable]
)
```

Alternativ B: Junction table (stödjer flera salar per kurs eller schemaläggning)
```
course_instance_rooms (
  id uuid [pk]
  course_instance_id uuid [fk -> course_instances.id]
  room_id uuid [fk -> rooms.id]
  created_at timestamp
  
  unique: (course_instance_id, room_id)
)
```

## Rekommendation: Alternativ A (direkt koppling)

**Varför:**
- Enklare struktur
- En kursinstans behöver typiskt bara en sal
- Om man behöver schemaläggning senare kan man lägga till det

## Frågor

1. **Ska `capacity` vara NOT NULL?**
   - Eller kan den vara NULL om okänd?

2. **Vad är formatet för `allowed_subjects`?**
   - Array av strings: `["fysik", "kemi", "biologi"]`
   - Eller array av course categories: `["FOUNDATIONAL_SUBJECTS", "ORIENTATION"]`?
   - Eller något annat?

3. **Ska `room_number` vara unikt per projekt?**
   - Eller globalt unikt?
   - Rekommenderar: per projekt (enklare)

4. **Vad händer om `allowed_subjects` är NULL/empty?**
   - Inga begränsningar (salen kan ta alla ämnen)
   - Eller måste den alltid ha begränsningar?

