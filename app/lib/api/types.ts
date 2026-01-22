// TypeScript types for API requests and responses
// These should match the backend types

export interface CourseAssignment {
    id?: string; // Course instance ID
    courseCode: string;
    courseName: string;
    points: number;
    category: 'FOUNDATIONAL_SUBJECTS' | 'PROGRAMME_SPECIFIC_SUBJECTS' | 'ORIENTATION' | 'INDIVIDUAL_CHOICE' | 'GYMNASIEARBETE';
    year: 1 | 2 | 3;
    terms: ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[]; // Array of terms this course spans over
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
    status: 'draft' | 'approved' | 'archived';
    version: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProjectWithDetails extends Project {
    classes: (ProjectClass & {
        curriculum?: ClassCurriculum;
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
export type ScheduleStatus = 'draft' | 'approved' | 'archived' | 'failed';
export type SolverStatus = 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'TIMEOUT' | 'ERROR';
export type TermType = 'fall' | 'spring';

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
}

export interface ScheduleWithLessons {
    schedule: GeneratedSchedule;
    lessons: ScheduledLesson[];
}
