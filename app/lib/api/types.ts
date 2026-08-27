// TypeScript types for API requests and responses
// These should match the backend types

/**
 * Kurskategorierna som Skolverket-proxyn levererar. PROGRAMME_SPECIALIZATION
 * (programfördjupning) och GYMNASIEARBETE är egna kategorier — tidigare
 * smögs de in som ORIENTATION respektive PROGRAMME_SPECIFIC_SUBJECTS, vilket
 * gjorde inriktning och programfördjupning omöjliga att validera var för sig.
 */
export type CourseCategory =
    | 'FOUNDATIONAL_SUBJECTS'
    | 'PROGRAMME_SPECIFIC_SUBJECTS'
    | 'ORIENTATION'
    | 'PROGRAMME_SPECIALIZATION'
    | 'INDIVIDUAL_CHOICE'
    | 'GYMNASIEARBETE';

export type TermId = 'term1' | 'term2' | 'term3' | 'term4' | 'term5' | 'term6';

export type CurriculumStatus = 'draft' | 'approved' | 'archived';

export interface CourseAssignment {
    id?: string; // Course instance ID
    courseCode: string;
    courseName: string;
    subject?: string | null; // Skolverket subject for room allowedSubjects matching
    points: number;
    category: CourseCategory;
    year: 1 | 2 | 3;
    terms: TermId[]; // Array of terms this course spans over
    teacherId?: string | null;
    teacherName?: string | null;
    roomId?: string | null;
}

export interface User {
    id: string;
    email: string;
    name: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface Project {
    id: string;
    userId: string;
    name: string;
    description?: string;
    // Time settings
    earliestLessonStart?: string; // TIME format: "HH:MM:SS"
    latestLessonEnd?: string; // TIME format: "HH:MM:SS"
    defaultLessonDuration?: number; // minutes
    mentorTimePerWeek?: number; // minutes
    lunchDuration?: number; // minutes
    earliestLunchTime?: string; // TIME format: "HH:MM:SS"
    latestLunchTime?: string; // TIME format: "HH:MM:SS"
    shortestBreakBetweenLessons?: number; // minutes
    longestBreakBetweenLessons?: number; // minutes
    teacherBreakMinutes?: number; // minutes between a teacher's lessons (default 15)
    fullTimeServicePoints?: number; // service points that count as 100% tjänst (default 600)
    createdAt: string;
    updatedAt: string;
}

export interface ProjectClass {
    id: string;
    projectId: string;
    classCode: string;
    programCode: string;
    programName: string;
    orientationCode: string;
    orientationName: string;
    startYear: number;
    graduationYear: number;
    isActive: number;
    createdAt: string;
}

export interface ClassCurriculum {
    id: string;
    classId: string;
    courses: CourseAssignment[];
    totalPoints: number;
    isValid: number;
    status: CurriculumStatus;
    version: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProjectWithDetails extends Project {
    classes: (ProjectClass & {
        curriculum?: ClassCurriculum;
        mentors?: ClassMentor[];
    })[];
}

// Request types
export interface RegisterRequest {
    email: string;
    name: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
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
    teacherBreakMinutes?: number; // minutes
    fullTimeServicePoints?: number; // points
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

export interface UpdateCurriculumStatusRequest {
    status: CurriculumStatus;
}

export interface Teacher {
    id: string;
    projectId: string;
    name: string;
    email?: string;
    subject?: string;
    notes?: string;
    createdAt: string;
}

export interface CreateTeacherRequest {
    name: string;
    email?: string;
    subject?: string;
    notes?: string;
}

export interface Room {
    id: string;
    projectId: string;
    roomNumber: string;
    roomType?: string;
    capacity?: number;
    notes?: string;
    createdAt: string;
}

export interface CreateRoomRequest {
    roomNumber: string;
    roomType?: string;
    capacity?: number;
    notes?: string;
}

// Term dates types
export interface TermDates {
    id: string;
    projectId: string;
    academicYear: string; // e.g., "2026/2027"
    year: 1 | 2 | 3; // Gymnasium year
    fallTermStart: string; // ISO date: "2026-08-19"
    fallTermEnd: string;
    springTermStart: string;
    springTermEnd: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTermDatesRequest {
    academicYear: string;
    year: 1 | 2 | 3;
    fallTermStart: string;
    fallTermEnd: string;
    springTermStart: string;
    springTermEnd: string;
}

// Schedule calculation types
export interface CourseScheduleCalculation {
    courseCode: string;
    courseName: string;
    points: number;
    terms: string[];
    totalMinutes: number;
    totalWeeks: number;
    minutesPerWeek: number;
    lessonsPerWeek: number;
    lessonDuration: number;
}

export interface ClassScheduleInfo {
    classId: string;
    classCode: string;
    programName: string;
    startYear: number;
    courses: CourseScheduleCalculation[];
    totalMinutesPerWeek: number;
}

export interface ProjectScheduleCalculation {
    projectId: string;
    projectName: string;
    defaultLessonDuration: number;
    classes: ClassScheduleInfo[];
    termDatesAvailable: boolean;
    missingTermDates: { year: number; academicYear: string }[];
}

// Generated schedule types
// ADR-0008: lifecycle is draft → active → superseded. `failed` is set when solver returns no schedule.
// `approved`/`archived` are legacy aliases kept for backward compatibility with old data.
export type ScheduleStatus = 'draft' | 'active' | 'superseded' | 'failed' | 'approved' | 'archived';
export type SolverStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT' | 'ERROR';
export type TermType = 'fall' | 'spring';

// Preflight warnings produced by the backend before the solver runs.
export type PreflightSeverity = 'warning' | 'error';
export interface PreflightWarning {
    severity: PreflightSeverity;
    type: string;
    message: string;
    courseInstanceId?: string;
    teacherId?: string;
    classId?: string;
}

export interface GeneratedSchedule {
    id: string;
    projectId: string;
    name: string;
    academicYear: string;
    termType: TermType;
    status: ScheduleStatus;
    solverStatus: SolverStatus | null;
    solverTimeMs: number | null;
    totalConflicts: number | null;
    generatedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface ScheduledLesson {
    id: string;
    scheduleId: string;
    courseInstanceId: string;
    classId: string;
    teacherId: string | null;
    roomId: string | null;
    dayOfWeek: number; // 1-5 (Monday-Friday)
    startTime: string; // "HH:MM:SS"
    endTime: string; // "HH:MM:SS"
    lessonIndex: number;
    durationMinutes: number;
    isLocked: number;
    createdAt: string;
    // Enriched fields from API
    courseCode?: string;
    courseName?: string;
    classCode?: string;
    teacherName?: string | null;
    roomNumber?: string | null;
}

export interface GenerateScheduleRequest {
    name?: string;
    academicYear: string;
    termType: TermType;
    specificTerm?: string; // Optional: specific term (term1, term2, etc.) - defaults to first term of termType
    timeoutSeconds?: number; // Solver time limit: 60 (snabb), 120 (normal), 300 (grundlig)
}

export interface GenerateScheduleResponse {
    schedule: GeneratedSchedule;
    result: {
        success: boolean;
        status: SolverStatus;
        message: string;
        lessonCount: number;
        solverTimeMs: number;
        totalConflicts: number;
    };
    preflight: PreflightWarning[];
}

export interface ScheduleWithLessons {
    schedule: GeneratedSchedule;
    lessons: ScheduledLesson[];
}

// Class Mentor types
export interface ClassMentor {
    id: string;
    classId: string;
    teacherId: string;
    isPrimary: number; // 1 = primary mentor, 0 = secondary mentor
    createdAt: string;
    // Enriched fields from API
    teacherName?: string;
    teacherEmail?: string;
}

export interface CreateMentorRequest {
    teacherId: string;
    isPrimary?: number; // Defaults to 1 (primary)
}

export interface UpdateMentorRequest {
    isPrimary: number;
}
