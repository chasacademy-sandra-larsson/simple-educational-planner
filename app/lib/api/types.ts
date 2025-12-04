// TypeScript types for API requests and responses
// These should match the backend types

export interface CourseAssignment {
    courseCode: string;
    courseName: string;
    points: number;
    category: 'FOUNDATIONAL_SUBJECTS' | 'PROGRAMME_SPECIFIC_SUBJECTS' | 'ORIENTATION' | 'INDIVIDUAL_CHOICE';
    year: 1 | 2 | 3;
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
    createdAt: string;
    updatedAt: string;
}

export interface ProjectProgram {
    id: string;
    projectId: string;
    programCode: string;
    programName: string;
    orientationCode: string;
    orientationName: string;
    createdAt: string;
}

export interface ProjectClass {
    id: string;
    projectId: string;
    programId: string;
    classCode: string;
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
    createdAt: string;
    updatedAt: string;
}

export interface ProjectWithDetails extends Project {
    programs: ProjectProgram[];
    classes: (ProjectClass & {
        program: ProjectProgram;
        curricula: ClassCurriculum[];
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
}

export interface CreateProgramRequest {
    programCode: string;
    programName: string;
    orientationCode: string;
    orientationName: string;
}

export interface CreateClassRequest {
    classCode: string;
    programId: string;
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
