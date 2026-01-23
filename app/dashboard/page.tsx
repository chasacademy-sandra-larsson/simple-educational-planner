"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/app/lib/api';
import type { Project } from '@/app/lib/api/types';
import GlobalHeader from '@/app/components/global-header';

export default function DashboardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);

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

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError('');

        try {
            await api.projects.create(newProject);
            setShowForm(false);
            setNewProject({ name: '', description: '' });
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
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            {/* Global Header */}
            <GlobalHeader />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                        Välkommen tillbaka, {user.name.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        Hantera dina utbildningsplaneringsprojekt
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="mb-8 p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                        Snabbåtgärder
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nytt projekt
                        </button>
                        {projects.length > 0 && (
                            <>
                                <button
                                    onClick={() => router.push(`/projects/${projects[0].id}`)}
                                    className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    Fortsätt senaste
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Create Project Form */}
                {showForm && (
                    <div className="mb-8 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                Skapa nytt projekt
                            </h3>
                            <button
                                onClick={() => {
                                    setShowForm(false);
                                    setNewProject({ name: '', description: '' });
                                    setCreateError('');
                                }}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {createError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-800 dark:text-red-200">{createError}</p>
                            </div>
                        )}

                        <form onSubmit={handleCreateProject} className="space-y-5">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Projektnamn *
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="t.ex. Hösttermin 2026"
                                />
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Beskrivning
                                </label>
                                <textarea
                                    id="description"
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                    placeholder="Beskriv ditt projekt..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setNewProject({ name: '', description: '' });
                                        setCreateError('');
                                    }}
                                    className="px-6 py-3 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-semibold rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
                                >
                                    {creating ? 'Skapar...' : 'Skapa projekt'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && projects.length === 0 && !showForm && (
                    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="text-6xl mb-4">📚</div>
                            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                Inga projekt ännu
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                                Kom igång genom att skapa ditt första utbildningsplaneringsprojekt
                            </p>
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Skapa första projektet
                            </button>
                        </div>
                    </div>
                )}

                {/* Project Grid */}
                {!loading && projects.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                            Mina projekt
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => {
                                const progress = getProjectProgress(project);
                                const status = getProgressStatus(progress);
                                
                                return (
                                    <div
                                        key={project.id}
                                        onClick={() => router.push(`/projects/${project.id}`)}
                                        className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer group"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">📁</span>
                                                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {project.name}
                                                    </h3>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteProject(project.id);
                                                }}
                                                className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                Radera
                                            </button>
                                        </div>
                                        
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                                            {project.description || 'Ingen beskrivning'}
                                        </p>

                                        {/* Progress Bar */}
                                        <div className="mb-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-xs font-medium ${status.color}`}>
                                                    {status.text}
                                                </span>
                                                <span className="text-xs text-zinc-500">{progress}%</span>
                                            </div>
                                            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500">
                                            <div className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Skapad {formatDate(project.createdAt)}
                                            </div>
                                            <svg className="w-5 h-5 text-zinc-400 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* New Project Card */}
                            {!showForm && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200 group min-h-[200px] flex flex-col items-center justify-center"
                                >
                                    <div className="text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span className="text-sm font-medium">Nytt projekt</span>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
