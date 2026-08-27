// TypeScript types for API requests and responses

/**
 * Kurskategorier enligt Skolverkets programstruktur.
 * Motsvarar nycklarna i ProgramStructure.categories (src/data/program-structures.ts).
 */
export const COURSE_CATEGORIES = [
    'FOUNDATIONAL_SUBJECTS',      // Gymnasiegemensamma ämnen
    'PROGRAMME_SPECIFIC_SUBJECTS', // Programgemensamma ämnen
    'ORIENTATION',                 // Inriktning
    'PROGRAMME_SPECIALIZATION',    // Programfördjupning
    'INDIVIDUAL_CHOICE',           // Individuellt val
    'GYMNASIEARBETE',              // Gymnasiearbete
] as const;

export type CourseCategory = typeof COURSE_CATEGORIES[number];

export function isCourseCategory(value: unknown): value is CourseCategory {
    return typeof value === 'string' && (COURSE_CATEGORIES as readonly string[]).includes(value);
}

export interface CourseAssignment {
    courseCode: string;
    courseName: string;
    points: number;
    category: CourseCategory;
    year: 1 | 2 | 3;
    terms: ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[]; // Array of terms this course spans over
}

/** Livscykel för en kursplan (class_curricula.status) */
export const CURRICULUM_STATUSES = ['draft', 'approved', 'archived'] as const;

export type CurriculumStatus = typeof CURRICULUM_STATUSES[number];

export function isCurriculumStatus(value: unknown): value is CurriculumStatus {
    return typeof value === 'string' && (CURRICULUM_STATUSES as readonly string[]).includes(value);
}

export interface UpdateCurriculumStatusRequest {
    status: CurriculumStatus;
}

export interface CreateProjectRequest {
    name: string;
    description?: string;
    // Time settings (all optional)
    earliestLessonStart?: string; // TIME format: "HH:MM:SS"
    latestLessonEnd?: string; // TIME format: "HH:MM:SS"
    defaultLessonDuration?: number; // minutes
    mentorTimePerWeek?: number; // minutes
    lunchDuration?: number; // minutes
    earliestLunchTime?: string; // TIME format: "HH:MM:SS"
    latestLunchTime?: string; // TIME format: "HH:MM:SS"
    shortestBreakBetweenLessons?: number; // minutes
    longestBreakBetweenLessons?: number; // minutes
}

export interface CreateClassRequest {
    classCode: string;
    programCode: string;
    programName: string;
    orientationCode: string;
    orientationName: string;
    startYear: number;
}

export interface UpdateCurriculumRequest {
    courses: CourseAssignment[];
}

export interface RegisterRequest {
    email: string;
    name: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
    };
}

export interface CreateTermDatesRequest {
    academicYear: string; // e.g., "2026/2027"
    year: 1 | 2 | 3; // Gymnasium year
    fallTermStart: string; // ISO date: "2026-08-19"
    fallTermEnd: string;
    springTermStart: string;
    springTermEnd: string;
}

export interface TermDatesResponse {
    id: string;
    projectId: string;
    academicYear: string;
    year: 1 | 2 | 3;
    fallTermStart: string;
    fallTermEnd: string;
    springTermStart: string;
    springTermEnd: string;
    createdAt: string;
    updatedAt: string;
}
