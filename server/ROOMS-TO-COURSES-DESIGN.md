# Salar kopplade till kurser: Designförslag

## Krav

1. Salar ska kopplas till specifika kursinstanser
2. En sal har ett unikt namn (unikt per projekt)
3. En sal har en kapacitet
4. En sal kan ha constraints för vilka ämnen som är tillåtna (t.ex. labbsal för fysik, kemi, biologi)

## Nuvarande struktur

```
rooms (
  id uuid [pk]
  project_id uuid [fk]
  room_number text [not null]  // Detta är troligen "namnet"
  room_type text
  capacity integer  // Redan finns!
  notes text
  created_at timestamp
)
```

## Designförslag

### Alternativ A: Room constraints via subject/category

Lägg till fält för att definiera vilka ämnen/kategorier som är tillåtna.

```
rooms (
  ... existing fields ...
  allowed_subjects jsonb  // Array av ämnen: ["Fysik", "Kemi", "Biologi"]
  // eller
  allowed_categories jsonb  // Array av kategorier: ["ORIENTATION", ...]
)
```

**Nackdelar:**
- Svårt att hantera olika benämningar för ämnen
- Inte flexibelt

### Alternativ B: Room-course assignment table (Rekommenderat)

Skapa en junction table för att koppla rooms till course_instances, och lägg till subject constraints på rooms.

```
rooms (
  ... existing fields ...
  allowed_subjects jsonb  // Array: ["Fysik", "Kemi", "Biologi"] eller NULL för alla ämnen
)

room_course_assignments (
  id uuid [pk]
  room_id uuid [fk -> rooms.id]
  course_instance_id uuid [fk -> course_instances.id]
  created_at timestamp
  
  unique: (room_id, course_instance_id)  // En kurs kan bara ha en sal (eller flera?)
)
```

### Alternativ C: Room constraints + course assignment per term

Om en kurs kan ha olika salar för olika terminer:

```
room_course_assignments (
  id uuid [pk]
  room_id uuid [fk -> rooms.id]
  course_instance_id uuid [fk -> course_instances.id]
  term text  // "term1", "term2", etc. eller NULL för alla terminer
  created_at timestamp
  
  unique: (room_id, course_instance_id, term)
)
```

## Rekommendation: Alternativ B med allowed_subjects

**Struktur:**
1. Lägg till `allowed_subjects` (JSONB array) till rooms
2. Skapa `room_course_assignments` för att koppla rooms till course_instances
3. Unique constraint på room_number per projekt (om det inte redan finns)

**Frågor:**
1. Kan en kurs ha flera salar? (T.ex. teori i en sal, lab i en annan?)
2. Eller har en kurs bara en sal?
3. Ska room_number vara unique per projekt? (Troligen ja)

## Exempel på användning

**Labbsal:**
```
room_number: "LAB1"
capacity: 24
allowed_subjects: ["Fysik", "Kemi", "Biologi"]
```

**Teorilärosal:**
```
room_number: "A101"
capacity: 30
allowed_subjects: null  // Alla ämnen tillåtna
```

**Koppling:**
```
course_instance: "Fysik 1" (id: xyz)
room_course_assignment: room_id=LAB1, course_instance_id=xyz
```

