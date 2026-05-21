# Tjänstefördelning: Schema-design

## Krav

1. Koppla kursinstanser med lärare per akademiskt år
2. Tjänstegrad per lärare per år (t.ex. 600 poäng per år)
3. Tjänstefördelning per akademiskt år (t.ex. "2026/2027")
4. Stöd för både kommande år (aktiv) och nästkommande år (planerad)

## Föreslagen struktur

### Tabell: `teacher_service_distributions`

Håller reda på en lärares tjänstefördelning för ett specifikt akademiskt år.

```
teacher_service_distributions (
  id uuid [pk]
  teacher_id uuid [fk -> teachers.id, on delete cascade]
  project_id uuid [fk -> projects.id, on delete cascade]  // För att kunna filtrera per projekt
  academic_year string [not null]  // "2026/2027"
  service_points integer [not null]  // Tjänstegrad i poäng per år (t.ex. 600)
  assigned_points integer [default 0]  // Beräknat från tilldelade kursinstanser
  created_at timestamp
  updated_at timestamp
  
  unique: (teacher_id, project_id, academic_year)  // En lärare kan bara ha en tjänstefördelning per år per projekt
)
```

### Tabell: `service_distribution_courses`

Kopplar kursinstanser till en tjänstefördelning.

```
service_distribution_courses (
  id uuid [pk]
  service_distribution_id uuid [fk -> teacher_service_distributions.id, on delete cascade]
  course_instance_id uuid [fk -> course_instances.id, on delete cascade]
  created_at timestamp
  
  unique: (service_distribution_id, course_instance_id)  // En kursinstans kan bara vara i en tjänstefördelning en gång
)
```

## Relationer

```
teachers (1) -> (many) teacher_service_distributions
projects (1) -> (many) teacher_service_distributions
teacher_service_distributions (1) -> (many) service_distribution_courses
course_instances (1) -> (one) service_distribution_courses
```

## Beräkning av akademiskt år

Akademiskt år beräknas från `course_instances.year` + `project_classes.startYear`:
- year = 1, startYear = 2026 → "2026/2027"
- year = 2, startYear = 2026 → "2027/2028"
- year = 3, startYear = 2026 → "2028/2029"

## Arbetsflöde

1. **Skapa tjänstefördelning för ett akademiskt år**
   - Välj lärare
   - Ange tjänstegrad (t.ex. 600 poäng)
   - Välj akademiskt år (t.ex. "2026/2027")

2. **Tilldela kursinstanser**
   - Välj kursinstanser som läraren ska undervisa
   - Systemet beräknar `assigned_points` automatiskt
   - Validering: assigned_points ≤ service_points

3. **Visa översikt**
   - Per akademiskt år: vilka lärare, deras tjänstegrad, tilldelade poäng
   - Per lärare: vilka kurser i vilka klasser

## Fördelar med denna design

✅ Tydlig separation mellan tjänstefördelning (planering) och course_instances.teacher_id (faktisk tilldelning)
✅ Stödjer planering för framtida år
✅ Enkel att beräkna hur mycket en lärare har tilldelat
✅ En kursinstans kan bara vara i en tjänstefördelning (ingen dubbelbokning)
✅ `assigned_points` kan beräknas automatiskt från kopplade course_instances

