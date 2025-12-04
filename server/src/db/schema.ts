import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
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
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Programs in a project
export const projectPrograms = pgTable('project_programs', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    programCode: text('program_code').notNull(), // e.g., "TE"
    programName: text('program_name').notNull(), // e.g., "Teknikprogrammet"
    orientationCode: text('orientation_code').notNull(), // e.g., "TEKTEK"
    orientationName: text('orientation_name').notNull(), // e.g., "Teknik"
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Classes in a project
export const projectClasses = pgTable('project_classes', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    programId: uuid('program_id').references(() => projectPrograms.id, { onDelete: 'cascade' }).notNull(),
    classCode: text('class_code').notNull(), // e.g., "TE26", "EK25"
    startYear: integer('start_year').notNull(), // e.g., 2026
    graduationYear: integer('graduation_year').notNull(), // e.g., 2029
    isActive: integer('is_active').notNull().default(1), // 1 = active, 0 = inactive
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Course curriculum for a class
export const classCurricula = pgTable('class_curricula', {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id').references(() => projectClasses.id, { onDelete: 'cascade' }).notNull(),
    courses: jsonb('courses').notNull(), // Array of CourseAssignment objects
    totalPoints: integer('total_points').notNull().default(0),
    isValid: integer('is_valid').notNull().default(0), // 1 if totalPoints === 2500
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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

// Rooms in a project
export const rooms = pgTable('rooms', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    roomNumber: text('room_number').notNull(),
    roomType: text('room_type'),
    capacity: integer('capacity'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
    user: one(users, {
        fields: [projects.userId],
        references: [users.id],
    }),
    programs: many(projectPrograms),
    classes: many(projectClasses),
    teachers: many(teachers),
    rooms: many(rooms),
}));

export const projectProgramsRelations = relations(projectPrograms, ({ one, many }) => ({
    project: one(projects, {
        fields: [projectPrograms.projectId],
        references: [projects.id],
    }),
    classes: many(projectClasses),
}));

export const projectClassesRelations = relations(projectClasses, ({ one, many }) => ({
    project: one(projects, {
        fields: [projectClasses.projectId],
        references: [projects.id],
    }),
    program: one(projectPrograms, {
        fields: [projectClasses.programId],
        references: [projectPrograms.id],
    }),
    curricula: many(classCurricula),
}));

export const classCurriculaRelations = relations(classCurricula, ({ one }) => ({
    class: one(projectClasses, {
        fields: [classCurricula.classId],
        references: [projectClasses.id],
    }),
}));

export const teachersRelations = relations(teachers, ({ one }) => ({
    project: one(projects, {
        fields: [teachers.projectId],
        references: [projects.id],
    }),
}));

export const roomsRelations = relations(rooms, ({ one }) => ({
    project: one(projects, {
        fields: [rooms.projectId],
        references: [projects.id],
    }),
}));
