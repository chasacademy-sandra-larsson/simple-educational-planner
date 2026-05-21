"use client";

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import GlobalHeader from '@/app/components/global-header';
import { ProjectProvider, useProject } from './ProjectContext';

function ProjectLayout({ children }: { children: ReactNode }) {
    const { projectId, project, loading, error } = useProject();
    const pathname = usePathname();
    const router = useRouter();

    // Determine active tab from pathname
    const getActiveTab = () => {
        if (pathname.endsWith('/classes')) return 'classes';
        if (pathname.endsWith('/schedule')) return 'schedule';
        if (pathname.endsWith('/scheduling')) return 'scheduling';
        if (pathname.endsWith('/teachers')) return 'teachers';
        if (pathname.endsWith('/rooms')) return 'rooms';
        if (pathname.endsWith('/settings')) return 'settings';
        return 'summary';
    };
    const activeTab = getActiveTab();

    const navItems = [
        { key: 'summary', label: 'Oversikt', icon: '📊', href: `/projects/${projectId}` },
        { key: 'classes', label: 'Klasser', icon: '👥', href: `/projects/${projectId}/classes` },
        { key: 'schedule', label: 'Schema', icon: '📅', href: `/projects/${projectId}/schedule` },
        { key: 'scheduling', label: 'Schemaläggning', icon: '⚙️', href: `/projects/${projectId}/scheduling` },
        { key: 'teachers', label: 'Lärare', icon: '👨‍🏫', href: `/projects/${projectId}/teachers` },
        { key: 'rooms', label: 'Salar', icon: '🏫', href: `/projects/${projectId}/rooms` },
        { key: 'settings', label: 'Inställningar', icon: '⚙️', href: `/projects/${projectId}/settings` },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                        {error || 'Project not found'}
                    </h2>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
            <GlobalHeader currentProjectId={projectId} currentProjectName={project.name} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Project Header */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
                    <p className="text-zinc-600 dark:text-zinc-400">
                        {project.description || 'No description provided'}
                    </p>
                </div>

                {/* Navigation */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                    <div className="border-b border-zinc-200 dark:border-zinc-700">
                        <nav className="flex -mb-px overflow-x-auto">
                            {navItems.map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => router.push(item.href)}
                                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                                        activeTab === item.key
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300'
                                    }`}
                                >
                                    <span>{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Page Content */}
                    <div className="p-6">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ProjectLayoutWrapper({ children }: { children: ReactNode }) {
    return (
        <ProjectProvider>
            <ProjectLayout>{children}</ProjectLayout>
        </ProjectProvider>
    );
}
