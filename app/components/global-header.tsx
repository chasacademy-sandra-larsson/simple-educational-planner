"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/app/lib/api';
import type { Project } from '@/app/lib/api/types';

interface GlobalHeaderProps {
    currentProjectId?: string;
    currentProjectName?: string;
}

export default function GlobalHeader({ currentProjectId, currentProjectName }: GlobalHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [showProjectMenu, setShowProjectMenu] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const projectMenuRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentUser = api.auth.getCurrentUser();
        setUser(currentUser);

        // Fetch projects for the switcher
        const fetchProjects = async () => {
            try {
                const data = await api.projects.getAll();
                setProjects(data);
            } catch (err) {
                console.error('Failed to fetch projects:', err);
            }
        };

        if (currentUser) {
            fetchProjects();
        }
    }, []);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
                setShowProjectMenu(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        api.auth.logout();
        router.push('/auth/login');
    };

    // Generate breadcrumbs based on current path
    const getBreadcrumbs = () => {
        const crumbs: { label: string; href?: string }[] = [];
        
        if (pathname === '/dashboard') {
            crumbs.push({ label: 'Dashboard' });
        } else if (pathname.startsWith('/projects/')) {
            crumbs.push({ label: 'Dashboard', href: '/dashboard' });
            if (currentProjectName) {
                crumbs.push({ label: currentProjectName });
            }
        }
        
        return crumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    if (!user) {
        return null;
    }

    return (
        <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
            {/* Main Navigation */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left: Logo & Project Switcher */}
                    <div className="flex items-center gap-6">
                        {/* Logo */}
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <span className="text-2xl">🎓</span>
                            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                Educational Planner
                            </span>
                        </button>

                        {/* Project Switcher */}
                        <div className="relative" ref={projectMenuRef}>
                            <button
                                onClick={() => setShowProjectMenu(!showProjectMenu)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span>{currentProjectName || 'Välj projekt'}</span>
                                <svg className={`w-4 h-4 transition-transform ${showProjectMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Project Dropdown */}
                            {showProjectMenu && (
                                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                                    {projects.length > 0 ? (
                                        <>
                                            {projects.map((project) => (
                                                <button
                                                    key={project.id}
                                                    onClick={() => {
                                                        router.push(`/projects/${project.id}`);
                                                        setShowProjectMenu(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2 ${
                                                        project.id === currentProjectId
                                                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                                            : 'text-zinc-700 dark:text-zinc-300'
                                                    }`}
                                                >
                                                    {project.id === currentProjectId && (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                    <span className={project.id === currentProjectId ? '' : 'ml-6'}>
                                                        {project.name}
                                                    </span>
                                                </button>
                                            ))}
                                            <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                                        </>
                                    ) : null}
                                    <button
                                        onClick={() => {
                                            router.push('/dashboard');
                                            setShowProjectMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                        </svg>
                                        <span>Alla projekt</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowProjectMenu(false);
                                            // This will trigger the new project form on dashboard
                                            router.push('/dashboard?newProject=true');
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <span>Nytt projekt...</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: User Menu */}
                    <div className="flex items-center gap-4">
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <span className="hidden sm:inline">{user.name}</span>
                                <svg className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* User Dropdown */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-50">
                                    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {user.name}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {user.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span>Logga ut</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <nav className="flex items-center h-10 text-sm">
                            <span className="text-zinc-400 dark:text-zinc-500 mr-2">📍</span>
                            {breadcrumbs.map((crumb, index) => (
                                <span key={index} className="flex items-center">
                                    {index > 0 && (
                                        <svg className="w-4 h-4 mx-2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                    {crumb.href ? (
                                        <button
                                            onClick={() => router.push(crumb.href!)}
                                            className="text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {crumb.label}
                                        </button>
                                    ) : (
                                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                                            {crumb.label}
                                        </span>
                                    )}
                                </span>
                            ))}
                        </nav>
                    </div>
                </div>
            )}
        </header>
    );
}
