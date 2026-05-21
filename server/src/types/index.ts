// TypeScript types for API requests and responses

export interface CourseAssignment {
    courseCode: string;
    courseName: string;
    points: number;
    category: 'FOUNDATIONAL_SUBJECTS' | 'PROGRAMME_SPECIFIC_SUBJECTS' | 'ORIENTATION' | 'INDIVIDUAL_CHOICE' | 'GYMNASIEARBETE';
    year: 1 | 2 | 3;
    terms: ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[]; // Array of terms this course spans over
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
