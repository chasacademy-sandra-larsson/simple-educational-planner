# Förslag: Kursplan som egen resurs

## Problem med nuvarande design

1. **Semantik**: Kursplanen är en konceptuell enhet som borde vara en egen resurs
2. **Versionering**: Svårt att hantera flera versioner (draft vs approved)
3. **Historik**: Svårt att spara historik över tid
4. **Separation of concerns**: Metadata om kursplanen är blandat med klassinformation
5. **API design**: Oklart vad "curriculum" är - det är bara en samling av course_instances

## Förslag: Lägg tillbaka `class_curricula` tabell

### Ny struktur

```typescript
// Kursplan som egen resurs
export const classCurricula = pgTable('class_curricula', {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id').references(() => projectClasses.id, { onDelete: 'cascade' }).notNull(),
    totalPoints: integer('total_points').notNull().default(0),
    isValid: integer('is_valid').notNull().default(0), // 1 if totalPoints === 2500
    status: text('status').notNull().default('draft'), // 'draft', 'approved', 'archived'
    version: integer('version').notNull().default(1), // För versionering
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // En klass kan bara ha en aktiv kursplan (status = 'approved' eller 'draft')
    uniqueActiveCurriculumPerClass: unique('unique_active_curriculum_per_class').on(
        table.classId, 
        table.status
    ).where(sql`status IN ('draft', 'approved')`),
}));

// Course instances länkar till curriculum
export const courseInstances = pgTable('course_instances', {
    id: uuid('id').primaryKey().defaultRandom(),
    curriculumId: uuid('curriculum_id').references(() => classCurricula.id, { onDelete: 'cascade' }).notNull(),
    classId: uuid('class_id').references(() => projectClasses.id, { onDelete: 'cascade' }).notNull(), // Denormaliserad för snabbare queries
    teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
    roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
    courseCode: text('course_code').notNull(),
    courseName: text('course_name').notNull(),
    points: integer('points').notNull(),
    category: text('category').notNull(),
    year: integer('year').notNull(),
    terms: jsonb('terms').notNull(),
    lessonDuration: integer('lesson_duration'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    uniqueCoursePerClass: unique('unique_course_per_class').on(table.classId, table.courseCode),
}));
```

## Relationer

```
project_classes (1) -> (many) class_curricula
class_curricula (1) -> (many) course_instances
course_instances (many) -> (one) class_curricula
```

## Fördelar

✅ **Tydlig semantik**: Kursplanen är en explicit resurs
✅ **Versionering**: Kan ha flera versioner av kursplanen
✅ **Historik**: Kan spara gamla kursplaner
✅ **Separation of concerns**: Metadata om kursplanen är separerad från klassinformation
✅ **API design**: Tydligare API - `/api/projects/classes/:classId/curriculum` är en egen resurs
✅ **Status**: Kan hantera draft/approved/archived status
✅ **Flexibilitet**: Enklare att utöka med fler fält (t.ex. approved_by, approved_at)

## Nackdelar

❌ **Mer komplexitet**: En extra tabell
❌ **Extra join**: Behöver joina `class_curricula` när man hämtar kurser
❌ **Denormalisering**: `classId` i `course_instances` är denormaliserad (men behövs för snabbare queries)

## Rekommendation

**Ja, kursplanen borde vara en egen resurs** för att:
1. Göra datamodellen tydligare
2. Stödja versionering och historik
3. Bättre separation of concerns
4. Tydligare API-design

 Ytterligare komplexitet är värd det för bättre semantik och flexibilitet.

