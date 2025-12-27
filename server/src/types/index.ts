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
