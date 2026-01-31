"use client";

import { useState, useEffect } from 'react';
import { ProjectList } from '@/app/components/ProjectList';
import { OnboardingWizard } from '@/app/components/OnboardingWizard';
import { ScheduleView } from '@/app/components/ScheduleView';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/app/lib/api';
import type { Project } from '@/app/lib/api/types';
 //import GlobalHeader from '@/app/components/global-header';
import { LogOut, Plus, Calendar, Settings, Home } from 'lucide-react';


export default function DashboardPage() {

    const router = useRouter();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);

    const [currentView, setCurrentView] = useState('home');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    useEffect(() => {

        setMounted(true);
        const currentUser = api.auth.getCurrentUser();
        setUser(currentUser);
        fetchProjects();

        // Check if we should open new project form
        if (searchParams.get('newProject') === 'true') {
            setShowForm(true);
        }
    }, [router, searchParams]);

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
        setCreating(true);
        setCreateError('');

        try {
            await api.projects.create({ name: projectData.name, description: projectData.description || '' });
            await fetchProjects();
        } catch (err) {
            if (err instanceof ApiError) {
                setCreateError(err.message);
            } else {
                setCreateError('Kunde inte skapa projektet');
            }
        } finally {
            setCreating(false);
        }
    };

    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
        setCurrentView('onboarding');
    };

    const handleOnboardingComplete = () => {
        // Refresh projects to get updated progress
        fetchProjects();
        setCurrentView('schedule');
    };

    const handleEditConfiguration = () => {
        setCurrentView('onboarding');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate project progress (mock calculation based on classes)
    const getProjectProgress = (project: Project) => {
        // This is a simplified progress calculation
        // In a real app, you'd calculate based on actual completion status
        return Math.floor(Math.random() * 60) + 20; // Mock: 20-80%
    };

    const getProgressStatus = (progress: number): { text: string; color: string } => {
        if (progress < 30) return { text: 'Kom igång', color: 'text-orange-600 dark:text-orange-400' };
        if (progress < 60) return { text: 'Pågående', color: 'text-blue-600 dark:text-blue-400' };
        if (progress < 90) return { text: 'Nästan klart', color: 'text-green-600 dark:text-green-400' };
        return { text: 'Klart', color: 'text-green-600 dark:text-green-400' };
    };

    if (!mounted || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
    <div className="min-h-screen bg-gray-50 flex">
    {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Schemaläggning</h2>
              <p className="text-xs text-gray-500">Gymnasieskola</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setCurrentView('home')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
              currentView === 'home'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Hem</span>
          </button>
           {selectedProject && (
            <>
              <button
                onClick={() => setCurrentView('onboarding')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                  currentView === 'onboarding'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Inställningar</span>
              </button>
              {getProjectProgress(selectedProject) >= 90 && (
                <button
                  onClick={() => setCurrentView('schedule')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${
                    currentView === 'schedule'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>Schema</span>
                </button>
              )}
            </>
          )} 
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="px-4 py-3 bg-gray-50 rounded-lg mb-3">
            <p className="text-sm text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Logga ut</span>
          </button>
        </div>
      </aside>
      <main className="flex-1">
        {/* Error State */}
        {error && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {currentView === 'home' && (
          <ProjectList
            projects={projects}
            loading={loading}
            error={error}
            onCreateProject={handleCreateProject}
            onSelectProject={handleSelectProject}
            onDeleteProject={handleDeleteProject}
            getProjectProgress={getProjectProgress}
            formatDate={formatDate}
          />
        )}
        {currentView === 'onboarding' && selectedProject && (
          <OnboardingWizard
            project={{
              id: selectedProject.id,
              name: selectedProject.name,
              term: selectedProject.description?.includes('Höst') ? 'Hösttermin' : selectedProject.description?.includes('Vår') ? 'Vårtermin' : 'Hösttermin',
              year: new Date(selectedProject.createdAt).getFullYear().toString()
            } as any}
            onComplete={handleOnboardingComplete}
          />
        )}
        {currentView === 'schedule' && selectedProject && (
          <ScheduleView 
            project={{
              id: selectedProject.id,
              name: selectedProject.name,
              term: selectedProject.description?.includes('Höst') ? 'Hösttermin' : selectedProject.description?.includes('Vår') ? 'Vårtermin' : 'Hösttermin',
              year: new Date(selectedProject.createdAt).getFullYear().toString()
            } as any}
            onEditConfiguration={handleEditConfiguration}
          />
        )}
      </main>

     </div>

    );
}
