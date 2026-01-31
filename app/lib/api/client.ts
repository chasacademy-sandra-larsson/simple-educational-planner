// API Client for communicating with the backend

import {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    Project,
    ProjectWithDetails,
    CreateProjectRequest,
    CreateClassRequest,
    UpdateCurriculumRequest,
    ProjectClass,
    ClassCurriculum,
    Teacher,
    CreateTeacherRequest,
    Room,
    CreateRoomRequest,
    TermDates,
    CreateTermDatesRequest,
    ProjectScheduleCalculation,
    ClassScheduleInfo,
    GeneratedSchedule,
    GenerateScheduleRequest,
    GenerateScheduleResponse,
    ScheduleWithLessons,
    ScheduleStatus,
    ClassMentor,
    CreateMentorRequest,
    UpdateMentorRequest,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

// Helper function to get auth token from localStorage
function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}

// Helper function to make authenticated requests
async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getAuthToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new ApiError(response.status, error.error || 'Request failed');
    }

    return response.json();
}

// Auth API
export const authApi = {
    async register(data: RegisterRequest): Promise<AuthResponse> {
        const response = await fetchWithAuth<AuthResponse>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        // Save token to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }

        return response;
    },

    async login(data: LoginRequest): Promise<AuthResponse> {
        const response = await fetchWithAuth<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        // Save token to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('auth_token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }

        return response;
    },

    logout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
        }
    },

    getCurrentUser() {
        if (typeof window === 'undefined') return null;
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated(): boolean {
        return !!getAuthToken();
    },
};

// Initialize curricula response type
export interface InitializeCurriculaResult {
    classCode: string;
    success: boolean;
    error?: string;
    courseCount?: number;
}

export interface InitializeCurriculaResponse {
    message: string;
    initialized: number;
    results?: InitializeCurriculaResult[];
}

// Projects API
export const projectsApi = {
    async getAll(): Promise<Project[]> {
        return fetchWithAuth<Project[]>('/api/projects');
    },

    async getById(id: string): Promise<ProjectWithDetails> {
        return fetchWithAuth<ProjectWithDetails>(`/api/projects/${id}`);
    },

    async create(data: CreateProjectRequest): Promise<Project> {
        return fetchWithAuth<Project>('/api/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: CreateProjectRequest): Promise<Project> {
        return fetchWithAuth<Project>(`/api/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string): Promise<{ message: string }> {
        return fetchWithAuth<{ message: string }>(`/api/projects/${id}`, {
            method: 'DELETE',
        });
    },

    async addClass(projectId: string, data: CreateClassRequest): Promise<ProjectClass> {
        return fetchWithAuth<ProjectClass>(`/api/projects/${projectId}/classes`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async updateCurriculum(classId: string, data: UpdateCurriculumRequest): Promise<ClassCurriculum> {
        return fetchWithAuth<ClassCurriculum>(`/api/projects/classes/${classId}/curriculum`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async initializeCurricula(projectId: string): Promise<InitializeCurriculaResponse> {
        return fetchWithAuth<InitializeCurriculaResponse>(`/api/projects/${projectId}/initialize-curricula`, {
            method: 'POST',
        });
    },
};

// Teachers API
export const teachersApi = {
    async getAll(projectId: string): Promise<Teacher[]> {
        return fetchWithAuth<Teacher[]>(`/api/projects/${projectId}/teachers`);
    },

    async getById(id: string): Promise<Teacher> {
        return fetchWithAuth<Teacher>(`/api/teachers/${id}`);
    },

    async create(projectId: string, data: CreateTeacherRequest): Promise<Teacher> {
        return fetchWithAuth<Teacher>(`/api/projects/${projectId}/teachers`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: CreateTeacherRequest): Promise<Teacher> {
        return fetchWithAuth<Teacher>(`/api/teachers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string): Promise<{ message: string }> {
        return fetchWithAuth<{ message: string }>(`/api/teachers/${id}`, {
            method: 'DELETE',
        });
    },
};

// Rooms API
export const roomsApi = {
    async getAll(projectId: string): Promise<Room[]> {
        return fetchWithAuth<Room[]>(`/api/projects/${projectId}/rooms`);
    },

    async getById(id: string): Promise<Room> {
        return fetchWithAuth<Room>(`/api/rooms/${id}`);
    },

    async create(projectId: string, data: CreateRoomRequest): Promise<Room> {
        return fetchWithAuth<Room>(`/api/projects/${projectId}/rooms`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: CreateRoomRequest): Promise<Room> {
        return fetchWithAuth<Room>(`/api/rooms/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string): Promise<{ message: string }> {
        return fetchWithAuth<{ message: string }>(`/api/rooms/${id}`, {
            method: 'DELETE',
        });
    },
};

// Service Distributions API
export const serviceDistributionsApi = {
    async createForAllTeachers(projectId: string, academicYear: string, servicePoints: number = 600): Promise<{ distributions: any[], message: string }> {
        return fetchWithAuth<{ distributions: any[], message: string }>(`/api/projects/${projectId}/service-distributions`, {
            method: 'POST',
            body: JSON.stringify({ academicYear, servicePoints }),
        });
    },

    async update(projectId: string, distributionId: string, courseInstanceIds: string[]): Promise<any> {
        return fetchWithAuth<any>(`/api/projects/${projectId}/service-distributions/${distributionId}`, {
            method: 'PUT',
            body: JSON.stringify({ courseInstanceIds }),
        });
    },

    async getAll(projectId: string, academicYear?: string): Promise<any[]> {
        const url = academicYear
            ? `/api/projects/${projectId}/service-distributions?academicYear=${academicYear}`
            : `/api/projects/${projectId}/service-distributions`;
        return fetchWithAuth<any[]>(url);
    },

    async assignTeacherToCourse(projectId: string, courseInstanceId: string, teacherId: string | null): Promise<any> {
        return fetchWithAuth<any>(`/api/projects/${projectId}/course-instances/${courseInstanceId}/teacher`, {
            method: 'PUT',
            body: JSON.stringify({ teacherId }),
        });
    },
};

// Term Dates API
export const termDatesApi = {
    async getAll(projectId: string): Promise<TermDates[]> {
        return fetchWithAuth<TermDates[]>(`/api/projects/${projectId}/term-dates`);
    },

    async getByAcademicYear(projectId: string, academicYear: string): Promise<TermDates[]> {
        return fetchWithAuth<TermDates[]>(`/api/projects/${projectId}/term-dates/${academicYear}`);
    },

    async create(projectId: string, data: CreateTermDatesRequest): Promise<TermDates> {
        return fetchWithAuth<TermDates>(`/api/projects/${projectId}/term-dates`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: Partial<CreateTermDatesRequest>): Promise<TermDates> {
        return fetchWithAuth<TermDates>(`/api/term-dates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string): Promise<{ message: string }> {
        return fetchWithAuth<{ message: string }>(`/api/term-dates/${id}`, {
            method: 'DELETE',
        });
    },
};

// Schedule API
export const scheduleApi = {
    async calculateForProject(projectId: string): Promise<ProjectScheduleCalculation> {
        return fetchWithAuth<ProjectScheduleCalculation>(`/api/projects/${projectId}/schedule/calculate`);
    },

    async calculateForClass(projectId: string, classId: string): Promise<ClassScheduleInfo & { termDatesAvailable: boolean }> {
        return fetchWithAuth<ClassScheduleInfo & { termDatesAvailable: boolean }>(`/api/projects/${projectId}/classes/${classId}/schedule`);
    },
};

// Schedule Generator API
export const scheduleGeneratorApi = {
    async generate(projectId: string, data: GenerateScheduleRequest): Promise<GenerateScheduleResponse> {
        return fetchWithAuth<GenerateScheduleResponse>(`/api/projects/${projectId}/schedules/generate`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async getAll(projectId: string): Promise<GeneratedSchedule[]> {
        return fetchWithAuth<GeneratedSchedule[]>(`/api/projects/${projectId}/schedules`);
    },

    async getById(projectId: string, scheduleId: string): Promise<ScheduleWithLessons> {
        return fetchWithAuth<ScheduleWithLessons>(`/api/projects/${projectId}/schedules/${scheduleId}`);
    },

    async delete(projectId: string, scheduleId: string): Promise<{ message: string }> {
        return fetchWithAuth<{ message: string }>(`/api/projects/${projectId}/schedules/${scheduleId}`, {
            method: 'DELETE',
        });
    },

    async updateStatus(projectId: string, scheduleId: string, status: ScheduleStatus): Promise<GeneratedSchedule> {
        return fetchWithAuth<GeneratedSchedule>(`/api/projects/${projectId}/schedules/${scheduleId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    async getAcademicYears(projectId: string): Promise<{ academicYears: string[] }> {
        return fetchWithAuth<{ academicYears: string[] }>(`/api/projects/${projectId}/schedules/academic-years`);
    },
};

// Mentors API (class mentors - not counted in service points)
export const mentorsApi = {
    async getByClass(classId: string): Promise<ClassMentor[]> {
        return fetchWithAuth<ClassMentor[]>(`/api/classes/${classId}/mentors`);
    },

    async assign(classId: string, data: CreateMentorRequest): Promise<ClassMentor> {
        return fetchWithAuth<ClassMentor>(`/api/classes/${classId}/mentors`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(classId: string, teacherId: string, data: UpdateMentorRequest): Promise<ClassMentor> {
        return fetchWithAuth<ClassMentor>(`/api/classes/${classId}/mentors/${teacherId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async remove(classId: string, teacherId: string): Promise<{ message: string }> {
        return fetchWithAuth<{ message: string }>(`/api/classes/${classId}/mentors/${teacherId}`, {
            method: 'DELETE',
        });
    },
};

// Export everything as a single API object
export const api = {
    auth: authApi,
    projects: projectsApi,
    teachers: teachersApi,
    rooms: roomsApi,
    serviceDistributions: serviceDistributionsApi,
    termDates: termDatesApi,
    schedule: scheduleApi,
    scheduleGenerator: scheduleGeneratorApi,
    mentors: mentorsApi,
};

export { ApiError };
