import { pgTable, uuid, text, timestamp, time, integer, jsonb, unique, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Projects table (represents a "school" or planning scenario)
export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
    // Time settings
    earliestLessonStart: time('earliest_lesson_start'), // When lessons can earliest start (e.g., "08:00:00")
    latestLessonEnd: time('latest_lesson_end'), // When lessons can latest end (e.g., "17:00:00")
    defaultLessonDuration: integer('default_lesson_duration'), // Default lesson duration in minutes (e.g., 60) - used for calculations
    minLessonDuration: integer('min_lesson_duration'), // Minimum lesson duration in minutes (e.g., 40)
    maxLessonDuration: integer('max_lesson_duration'), // Maximum lesson duration in minutes (e.g., 90)
    mentorTimePerWeek: integer('mentor_time_per_week'), // Mentor time per week in minutes (e.g., 30)
    lunchDuration: integer('lunch_duration'), // Lunch duration in minutes (e.g., 45)
    earliestLunchTime: time('earliest_lunch_time'), // Earliest lunch time (e.g., "11:30:00")
    latestLunchTime: time('latest_lunch_time'), // Latest lunch time (e.g., "13:30:00")
    shortestBreakBetweenLessons: integer('shortest_break_between_lessons'), // Shortest break between lessons in minutes (e.g., 5)
    longestBreakBetweenLessons: integer('longest_break_between_lessons'), // Longest break between lessons in minutes (e.g., 15)
    teacherBreakMinutes: integer('teacher_break_minutes').notNull().default(15), // Minimum break between a teacher's lessons in minutes
    fullTimeServicePoints: integer('full_time_service_points').notNull().default(600), // Service points that count as 100% tjänst (varies per school: 600 or 700 is typical)
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Classes in a project
export const projectClasses = pgTable('project_classes', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    classCode: text('class_code').notNull(), // e.g., "TE26", "EK25"
    programCode: text('program_code').notNull(), // e.g., "TE"
    programName: text('program_name').notNull(), // e.g., "Teknikprogrammet"
    orientationCode: text('orientation_code').notNull(), // e.g., "TEKTEK"
    orientationName: text('orientation_name').notNull(), // e.g., "Teknik"
    startYear: integer('start_year').notNull(), // e.g., 2026
    graduationYear: integer('graduation_year').notNull(), // e.g., 2029
    isActive: integer('is_active').notNull().default(1), // 1 = active, 0 = inactive
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    // Unique constraint: classCode must be unique per project
    uniqueClassCodePerProject: unique('unique_class_code_per_project').on(table.projectId, table.classCode),
}));

// Curriculum - course plan as its own resource
export const classCurricula = pgTable('class_curricula', {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id').references(() => projectClasses.id, { onDelete: 'cascade' }).notNull(),
    totalPoints: integer('total_points').notNull().default(0), // Total points in curriculum
    isValid: integer('is_valid').notNull().default(0), // 1 if totalPoints === 2500
    status: text('status').notNull().default('draft'), // 'draft', 'approved', 'archived'
    version: integer('version').notNull().default(1), // For versioning
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // Unique constraint: one active curriculum per class (draft or approved)
    // Note: This constraint is simplified - PostgreSQL doesn't support partial unique constraints easily
    // We'll handle this in application logic instead
}));

// Teachers in a project
export const teachers = pgTable('teachers', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    email: text('email'),
    subject: text('subject'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Course instances - courses assigned to a curriculum with a specific teacher
export const courseInstances = pgTable('course_instances', {
    id: uuid('id').primaryKey().defaultRandom(),
    curriculumId: uuid('curriculum_id').references(() => classCurricula.id, { onDelete: 'cascade' }).notNull(),
    classId: uuid('class_id').references(() => projectClasses.id, { onDelete: 'cascade' }).notNull(), // Denormalized for faster queries
    teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'set null' }), // NULL if no teacher assigned yet
    roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }), // NULL if no room assigned yet
    courseCode: text('course_code').notNull(),
    courseName: text('course_name').notNull(),
    subject: text('subject'), // Subject from Skolverket (e.g., "fysik", "matematik"). Used for room subject-matching. NULL = not yet populated.
    points: integer('points').notNull(),
    category: text('category').notNull(), // FOUNDATIONAL_SUBJECTS, PROGRAMME_SPECIFIC_SUBJECTS, ORIENTATION, INDIVIDUAL_CHOICE, GYMNASIEARBETE
    year: integer('year').notNull(), // 1, 2, or 3
    terms: jsonb('terms').notNull(), // Array of term IDs: ["term1", "term2", ...]
    lessonDuration: integer('lesson_duration'), // Lesson duration in minutes. NULL = use project's defaultLessonDuration. If set, overrides default for this course.
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // Unique constraint: one course per class (one teacher per course-instance)
    uniqueCoursePerClass: unique('unique_course_per_class').on(table.classId, table.courseCode),
}));

// Rooms in a project
export const rooms = pgTable('rooms', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    roomNumber: text('room_number').notNull(), // Unique name per project (e.g., "LAB1", "A101")
    roomType: text('room_type'), // e.g., "Lab", "Classroom", "Computer lab"
    capacity: integer('capacity').notNull(), // Maximum number of students
    allowedSubjects: jsonb('allowed_subjects'), // Array of allowed subject names (e.g., ["fysik", "kemi", "biologi"]) or NULL for all subjects
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    // Unique constraint: roomNumber must be unique per project
    uniqueRoomNumberPerProject: unique('unique_room_number_per_project').on(table.projectId, table.roomNumber),
}));

// Class mentors - assigns teachers as mentors for classes
// Note: Mentor time is NOT counted in service points (tjänstefördelning)
// but IS included in schedule generation using project.mentorTimePerWeek
export const classMentors = pgTable('class_mentors', {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id').references(() => projectClasses.id, { onDelete: 'cascade' }).notNull(),
    teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
    isPrimary: integer('is_primary').notNull().default(1), // 1 = primary mentor, 0 = secondary mentor
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    // Unique constraint: a teacher can only be mentor for a class once
    uniqueMentorPerClass: unique('unique_mentor_per_class').on(table.classId, table.teacherId),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
    user: one(users, {
        fields: [projects.userId],
        references: [users.id],
    }),
    classes: many(projectClasses),
    teachers: many(teachers),
    rooms: many(rooms),
    teacherServiceDistributions: many(teacherServiceDistributions),
    termDates: many(termDates),
    generatedSchedules: many(generatedSchedules),
}));

export const projectClassesRelations = relations(projectClasses, ({ one, many }) => ({
    project: one(projects, {
        fields: [projectClasses.projectId],
        references: [projects.id],
    }),
    curricula: many(classCurricula),
    courseInstances: many(courseInstances),
    mentors: many(classMentors),
}));

export const teachersRelations = relations(teachers, ({ one, many }) => ({
    project: one(projects, {
        fields: [teachers.projectId],
        references: [projects.id],
    }),
    courseInstances: many(courseInstances),
    serviceDistributions: many(teacherServiceDistributions),
    mentorships: many(classMentors),
}));

export const classCurriculaRelations = relations(classCurricula, ({ one, many }) => ({
    class: one(projectClasses, {
        fields: [classCurricula.classId],
        references: [projectClasses.id],
    }),
    courseInstances: many(courseInstances),
}));

export const courseInstancesRelations = relations(courseInstances, ({ one }) => ({
    curriculum: one(classCurricula, {
        fields: [courseInstances.curriculumId],
        references: [classCurricula.id],
    }),
    class: one(projectClasses, {
        fields: [courseInstances.classId],
        references: [projectClasses.id],
    }),
    teacher: one(teachers, {
        fields: [courseInstances.teacherId],
        references: [teachers.id],
    }),
    room: one(rooms, {
        fields: [courseInstances.roomId],
        references: [rooms.id],
    }),
}));

// Teacher service distribution - assignment of courses to teachers per academic year
export const teacherServiceDistributions = pgTable('teacher_service_distributions', {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }).notNull(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(), // For filtering per project
    academicYear: text('academic_year').notNull(), // e.g., "2026/2027"
    servicePoints: integer('service_points').notNull(), // Tjänstegrad in points per year (e.g., 600)
    assignedPoints: integer('assigned_points').notNull().default(0), // Calculated from assigned course instances
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // Unique constraint: one service distribution per teacher per project per academic year
    uniqueDistributionPerTeacherPerYear: unique('unique_distribution_per_teacher_per_year').on(table.teacherId, table.projectId, table.academicYear),
}));

// Links course instances to service distributions
export const serviceDistributionCourses = pgTable('service_distribution_courses', {
    id: uuid('id').primaryKey().defaultRandom(),
    serviceDistributionId: uuid('service_distribution_id').references(() => teacherServiceDistributions.id, { onDelete: 'cascade' }).notNull(),
    courseInstanceId: uuid('course_instance_id').references(() => courseInstances.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    // Unique constraint: a course instance can only be in one service distribution
    uniqueCourseInstancePerDistribution: unique('unique_course_instance_per_distribution').on(table.serviceDistributionId, table.courseInstanceId),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
    project: one(projects, {
        fields: [rooms.projectId],
        references: [projects.id],
    }),
    courseInstances: many(courseInstances),
}));

export const teacherServiceDistributionsRelations = relations(teacherServiceDistributions, ({ one, many }) => ({
    teacher: one(teachers, {
        fields: [teacherServiceDistributions.teacherId],
        references: [teachers.id],
    }),
    project: one(projects, {
        fields: [teacherServiceDistributions.projectId],
        references: [projects.id],
    }),
    courses: many(serviceDistributionCourses),
}));

export const serviceDistributionCoursesRelations = relations(serviceDistributionCourses, ({ one }) => ({
    serviceDistribution: one(teacherServiceDistributions, {
        fields: [serviceDistributionCourses.serviceDistributionId],
        references: [teacherServiceDistributions.id],
    }),
    courseInstance: one(courseInstances, {
        fields: [serviceDistributionCourses.courseInstanceId],
        references: [courseInstances.id],
    }),
}));

// Term dates - stores start/end dates for fall (höst) and spring (vår) terms per academic year
export const termDates = pgTable('term_dates', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    academicYear: text('academic_year').notNull(), // e.g., "2026/2027"
    year: integer('year').notNull(), // 1, 2, or 3 (gymnasium year)
    // Fall term (Hösttermin) - corresponds to term1, term3, term5
    fallTermStart: date('fall_term_start').notNull(),
    fallTermEnd: date('fall_term_end').notNull(),
    // Spring term (Vårtermin) - corresponds to term2, term4, term6
    springTermStart: date('spring_term_start').notNull(),
    springTermEnd: date('spring_term_end').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    // Unique constraint: one set of term dates per project per academic year per gymnasium year
    uniqueTermDatesPerProjectYear: unique('unique_term_dates_per_project_year').on(table.projectId, table.academicYear, table.year),
}));

export const termDatesRelations = relations(termDates, ({ one }) => ({
    project: one(projects, {
        fields: [termDates.projectId],
        references: [projects.id],
    }),
}));

export const classMentorsRelations = relations(classMentors, ({ one }) => ({
    class: one(projectClasses, {
        fields: [classMentors.classId],
        references: [projectClasses.id],
    }),
    teacher: one(teachers, {
        fields: [classMentors.teacherId],
        references: [teachers.id],
    }),
}));

// Generated schedules - metadata for generated schedules
export const generatedSchedules = pgTable('generated_schedules', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(), // User-friendly name for the schedule
    academicYear: text('academic_year').notNull(), // e.g., "2026/2027"
    termType: text('term_type').notNull(), // 'fall' or 'spring'
    status: text('status').notNull().default('draft'), // 'draft', 'approved', 'archived', 'failed'
    solverStatus: text('solver_status'), // 'OPTIMAL', 'FEASIBLE', 'INFEASIBLE', 'UNKNOWN'
    solverTimeMs: integer('solver_time_ms'), // Time taken by solver in milliseconds
    totalConflicts: integer('total_conflicts').default(0), // Number of soft constraint violations
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Scheduled lessons - individual lessons in a generated schedule
export const scheduledLessons = pgTable('scheduled_lessons', {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduleId: uuid('schedule_id').references(() => generatedSchedules.id, { onDelete: 'cascade' }).notNull(),
    courseInstanceId: uuid('course_instance_id').references(() => courseInstances.id, { onDelete: 'cascade' }).notNull(),
    classId: uuid('class_id').references(() => projectClasses.id, { onDelete: 'cascade' }).notNull(),
    teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
    roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
    dayOfWeek: integer('day_of_week').notNull(), // 1-5 (Monday-Friday)
    startTime: time('start_time').notNull(), // e.g., "08:00:00"
    endTime: time('end_time').notNull(), // e.g., "09:00:00"
    lessonIndex: integer('lesson_index').notNull(), // Which lesson number for this course in the week
    durationMinutes: integer('duration_minutes').notNull(), // Duration in minutes
    isLocked: integer('is_locked').notNull().default(0), // 1 = locked, 0 = can be moved
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations for generated schedules
export const generatedSchedulesRelations = relations(generatedSchedules, ({ one, many }) => ({
    project: one(projects, {
        fields: [generatedSchedules.projectId],
        references: [projects.id],
    }),
    lessons: many(scheduledLessons),
}));

// Relations for scheduled lessons
export const scheduledLessonsRelations = relations(scheduledLessons, ({ one }) => ({
    schedule: one(generatedSchedules, {
        fields: [scheduledLessons.scheduleId],
        references: [generatedSchedules.id],
    }),
    courseInstance: one(courseInstances, {
        fields: [scheduledLessons.courseInstanceId],
        references: [courseInstances.id],
    }),
    class: one(projectClasses, {
        fields: [scheduledLessons.classId],
        references: [projectClasses.id],
    }),
    teacher: one(teachers, {
        fields: [scheduledLessons.teacherId],
        references: [teachers.id],
    }),
    room: one(rooms, {
        fields: [scheduledLessons.roomId],
        references: [rooms.id],
    }),
}));
