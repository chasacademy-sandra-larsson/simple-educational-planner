# Tjänstefördelning: Designförslag

## Krav

1. Koppla ihop kursinstanser (course_instances) med lärare
2. För varje lärare måste man ange tjänstegrad (t.ex. 600 poäng per år)
3. En tjänstefördelning görs per år (akademiskt år, t.ex. 2026/2027)
4. Mest aktuellt för kommande år, men planering kan finnas för nästkommande år

## Designförslag

### Alternativ A: Tjänstefördelning per lärare per år

En tabell som håller reda på vilka kursinstanser varje lärare har fördelats för ett specifikt akademiskt år.

```
teacher_service_distributions (
  id uuid [pk]
  teacher_id uuid [fk -> teachers.id]
  academic_year string [not null]  // "2026/2027"
  service_points integer [not null]  // Tjänstegrad i poäng per år (t.ex. 600)
  created_at timestamp
  updated_at timestamp
  
  unique: (teacher_id, academic_year)  // En lärare kan bara ha en tjänstefördelning per år
)

teacher_course_assignments (
  id uuid [pk]
  service_distribution_id uuid [fk -> teacher_service_distributions.id, on delete cascade]
  course_instance_id uuid [fk -> course_instances.id, on delete cascade]
  created_at timestamp
  
  unique: (service_distribution_id, course_instance_id)  // En kursinstans kan bara vara i en tjänstefördelning en gång
)
```

### Alternativ B: Enklare - direkt koppling med akademiskt år

Förbättra course_instances för att stödja akademiskt år och lägga till tjänstegrad på lärare-nivå.

**Fördelar:**
- Enklare struktur
- Akademiskt år direkt i course_instances

**Nackdelar:**
- Svårare att spåra tjänstegrad per år per lärare

### Alternativ C: Hybrid - Behåll teacherId i course_instances + Tjänstefördelning

Behåll `course_instances.teacher_id` men lägg till en tjänstefördelning-tabell för att hantera planering och tjänstegrad.

```
teacher_service_distributions (
  id uuid [pk]
  teacher_id uuid [fk -> teachers.id]
  academic_year string [not null]  // "2026/2027"
  service_points integer [not null]  // Tjänstegrad (t.ex. 600 poäng per år)
  assigned_points integer [default 0]  // Beräknat från course_instances
  created_at timestamp
  updated_at timestamp
  
  unique: (teacher_id, academic_year)
)
```

Och course_instances får ett academic_year fält för att koppla till rätt år.

## Rekommendation: Alternativ C (Hybrid)

**Varför:**
- `course_instances.teacher_id` finns redan och fungerar
- Tjänstefördelning-tabellen ger en tydlig vy över planering per år
- `assigned_points` kan beräknas automatiskt från course_instances
- Stödjer både planering (tjänstefördelning) och faktiska tilldelningar (course_instances.teacher_id)

## Frågor att besvara

1. **Hur relaterar akademiskt år till course_instances?**
   - Lägg till `academic_year` i course_instances?
   - Eller beräkna det från `year` + klassens `startYear`?

2. **Kan en lärare ha olika tjänstegrad för olika år?**
   - Om ja: tjänstefördelning per år är rätt
   - Om nej: tjänstegrad kan vara direkt på teachers tabellen

3. **Vad händer med course_instances.teacher_id?**
   - Behålls för faktiska tilldelningar
   - Tjänstefördelning används för planering

4. **Kan en kursinstans vara i flera tjänstefördelningar?**
   - T.ex. planerad för nästa år och faktisk för i år?
   - Eller är det en-till-en?

