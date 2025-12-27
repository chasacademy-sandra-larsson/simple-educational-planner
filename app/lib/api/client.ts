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

// Export everything as a single API object
export const api = {
    auth: authApi,
    projects: projectsApi,
    teachers: teachersApi,
    rooms: roomsApi,
};

export { ApiError };
