// TypeScript types for API requests and responses
// These should match the backend types

export interface CourseAssignment {
    courseCode: string;
    courseName: string;
    points: number;
    category: 'FOUNDATIONAL_SUBJECTS' | 'PROGRAMME_SPECIFIC_SUBJECTS' | 'ORIENTATION' | 'INDIVIDUAL_CHOICE' | 'GYMNASIEARBETE';
    year: 1 | 2 | 3;
    terms: ("term1" | "term2" | "term3" | "term4" | "term5" | "term6")[]; // Array of terms this course spans over
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
