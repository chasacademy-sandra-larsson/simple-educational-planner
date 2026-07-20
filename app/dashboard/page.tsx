"use client";

import { useState, useEffect } from 'react';
import { ProjectList } from '@/app/components/ProjectList';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/app/lib/api';
import type { Project } from '@/app/lib/api/types';
import { LogOut, Calendar } from 'lucide-react';


export default function DashboardPage() {

    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);

    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [autoOpenCreate, setAutoOpenCreate] = useState(false);

    useEffect(() => {
        setMounted(true);
        const currentUser = api.auth.getCurrentUser();
        setUser(currentUser);
        fetchProjects();

        // Öppna skapa-dialogen direkt om vi kom hit via "Nytt projekt..."
        if (new URLSearchParams(window.location.search).get('newProject') === 'true') {
            setAutoOpenCreate(true);
        }
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await api.projects.getAll();
            setProjects(data);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Kunde inte ladda projekt');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!window.confirm('Är du säker på att du vill radera detta projekt? Detta kan inte ångras.')) {
            return;
        }

        try {
            setError('');
            await api.projects.delete(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError('Kunde inte radera projektet');
            }
        }
    };

    const handleCreateProject = async (projectData: { name: string; description?: string }) => {
        try {
            const created = await api.projects.create({ name: projectData.name, description: projectData.description || '' });
            await fetchProjects();
            // Nyskapat projekt öppnas direkt i arbetsytan
            if (created?.id) {
                router.push(`/projects/${created.id}`);
            }
        } catch (err) {
            // Kastas vidare så att ProjectList kan visa felet i dialogen
            throw err;
        }
    };

    const handleSelectProject = (project: Project) => {
        router.push(`/projects/${project.id}`);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (!mounted || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
    <div className="min-h-screen bg-background flex">
    {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">Schemaläggning</h2>
              <p className="text-xs text-muted-foreground">Gymnasieskola</p>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="p-4 border-t border-border">
          <div className="px-4 py-3 bg-muted rounded-lg mb-3">
            <p className="text-sm text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-foreground hover:bg-muted rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logga ut</span>
          </button>
        </div>
      </aside>
      <main className="flex-1">
        {/* Error State */}
        {error && (
          <div className="p-4 m-4 bg-destructive/10 border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <ProjectList
          projects={projects}
          loading={loading}
          error={error}
          onCreateProject={handleCreateProject}
          onSelectProject={handleSelectProject}
          onDeleteProject={handleDeleteProject}
          formatDate={formatDate}
          autoOpenCreate={autoOpenCreate}
        />
      </main>

     </div>

    );
}
