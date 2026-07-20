"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/app/lib/api';
import type { Project } from '@/app/lib/api/types';
import { Check, ChevronDown, FolderOpen, LayoutList, Plus, LogOut, MapPin } from 'lucide-react';
import {
    Breadcrumb as BreadcrumbNav,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface GlobalHeaderProps {
    currentProjectId?: string;
    currentProjectName?: string;
}

export default function GlobalHeader({ currentProjectId, currentProjectName }: GlobalHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => {
        const currentUser = api.auth.getCurrentUser();
        setUser(currentUser);

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

    const handleLogout = () => {
        api.auth.logout();
        router.push('/auth/login');
    };

    // Breadcrumbs
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

    if (!user) return null;

    return (
        <header className="sticky top-0 z-50 bg-background dark:bg-background border-b border-border dark:border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left: Logo & Project Switcher */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <span className="text-2xl">🎓</span>
                            <span className="text-xl font-bold text-foreground dark:text-foreground">
                                Educational Planner
                            </span>
                        </button>

                        {/* Project Switcher Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted rounded-lg transition-colors">
                                <FolderOpen className="w-4 h-4" />
                                <span>{currentProjectName || 'Välj projekt'}</span>
                                <ChevronDown className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64">
                                {projects.length > 0 && (
                                    <>
                                        <DropdownMenuLabel>Projekt</DropdownMenuLabel>
                                        {projects.map((project) => (
                                            <DropdownMenuItem
                                                key={project.id}
                                                onClick={() => router.push(`/projects/${project.id}`)}
                                            >
                                                {project.id === currentProjectId ? (
                                                    <Check className="w-4 h-4" />
                                                ) : (
                                                    <span className="w-4 h-4" />
                                                )}
                                                <span>{project.name}</span>
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                    <LayoutList className="w-4 h-4" />
                                    <span>Alla projekt</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push('/dashboard?newProject=true')}>
                                    <Plus className="w-4 h-4" />
                                    <span>Nytt projekt...</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Right: User Menu */}
                    <div className="flex items-center gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted rounded-lg transition-colors">
                                <div className="w-8 h-8 bg-accent dark:bg-accent/30 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-semibold text-primary dark:text-primary">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <span className="hidden sm:inline">{user.name}</span>
                                <ChevronDown className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div>
                                        <p className="text-sm font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                                    <LogOut className="w-4 h-4" />
                                    <span>Logga ut</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
                <div className="bg-muted/50 border-t border-border">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center">
                        <BreadcrumbNav>
                            <BreadcrumbList>
                                {breadcrumbs.map((crumb, index) => (
                                    <BreadcrumbItem key={index}>
                                        {index > 0 && <BreadcrumbSeparator />}
                                        {crumb.href ? (
                                            <BreadcrumbLink
                                                render={<button onClick={() => router.push(crumb.href!)} />}
                                            >
                                                {crumb.label}
                                            </BreadcrumbLink>
                                        ) : (
                                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                        )}
                                    </BreadcrumbItem>
                                ))}
                            </BreadcrumbList>
                        </BreadcrumbNav>
                    </div>
                </div>
            )}
        </header>
    );
}
