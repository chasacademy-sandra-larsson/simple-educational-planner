"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/app/lib/api';
import type { ProjectWithDetails, Project, Teacher, Room } from '@/app/lib/api/types';

interface ProjectContextType {
    projectId: string;
    project: ProjectWithDetails | null;
    teachers: Teacher[];
    rooms: Room[];
    loading: boolean;
    error: string;
    fetchProject: () => Promise<void>;
    fetchTeachers: () => Promise<void>;
    fetchRooms: () => Promise<void>;
    handleProjectUpdate: (updatedProject: Project) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function useProject() {
    const ctx = useContext(ProjectContext);
    if (!ctx) throw new Error('useProject must be used within ProjectProvider');
    return ctx;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<ProjectWithDetails | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchProject = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await api.projects.getById(projectId);
            setProject(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Failed to load project');
            }
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    const fetchTeachers = useCallback(async () => {
        try {
            const data = await api.teachers.getAll(projectId);
            setTeachers(data);
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
        }
    }, [projectId]);

    const fetchRooms = useCallback(async () => {
        try {
            const data = await api.rooms.getAll(projectId);
            setRooms(data);
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        }
    }, [projectId]);

    const handleProjectUpdate = useCallback((updatedProject: Project) => {
        if (project) {
            setProject({
                ...updatedProject,
                classes: project.classes,
            } as ProjectWithDetails);
        }
    }, [project]);

    useEffect(() => {
        if (projectId) {
            fetchProject();
            fetchTeachers();
            fetchRooms();
        }
    }, [projectId, fetchProject, fetchTeachers, fetchRooms]);

    return (
        <ProjectContext.Provider value={{
            projectId,
            project,
            teachers,
            rooms,
            loading,
            error,
            fetchProject,
            fetchTeachers,
            fetchRooms,
            handleProjectUpdate,
        }}>
            {children}
        </ProjectContext.Provider>
    );
}
