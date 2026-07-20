"use client";

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import GlobalHeader from '@/app/components/global-header';
import { ProjectProvider, useProject } from './ProjectContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function ProjectLayout({ children }: { children: ReactNode }) {
    const { projectId, project, loading, error } = useProject();
    const pathname = usePathname();
    const router = useRouter();

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
        { value: 'summary', label: 'Kontrollrum', icon: '📊', href: `/projects/${projectId}` },
        { value: 'classes', label: 'Klasser', icon: '👥', href: `/projects/${projectId}/classes` },
        { value: 'schedule', label: 'Schema', icon: '📅', href: `/projects/${projectId}/schedule` },
        { value: 'scheduling', label: 'Schemaläggning', icon: '⚙️', href: `/projects/${projectId}/scheduling` },
        { value: 'teachers', label: 'Lärare', icon: '👨‍🏫', href: `/projects/${projectId}/teachers` },
        { value: 'rooms', label: 'Salar', icon: '🏫', href: `/projects/${projectId}/rooms` },
        { value: 'settings', label: 'Inställningar', icon: '⚙️', href: `/projects/${projectId}/settings` },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold mb-2">
                        {error || 'Projektet hittades inte'}
                    </h2>
                    <Button size="lg" onClick={() => router.push('/dashboard')} className="mt-4">
                        Tillbaka till Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <GlobalHeader currentProjectId={projectId} currentProjectName={project.name} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Project Header */}
                <Card className="mb-6">
                    <CardContent>
                        <CardDescription>
                            {project.description || 'Ingen beskrivning'}
                        </CardDescription>
                    </CardContent>
                </Card>

                {/* Tabs Navigation + Content */}
                <Card className="overflow-hidden">
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) => {
                            const item = navItems.find(n => n.value === value);
                            if (item) router.push(item.href);
                        }}
                    >
                        <div className="border-b border-border px-2">
                            <TabsList variant="line" className="w-full justify-start">
                                {navItems.map((item) => (
                                    <TabsTrigger
                                        key={item.value}
                                        value={item.value}
                                        className="gap-2 px-4 py-3"
                                    >
                                        <span>{item.icon}</span>
                                        {item.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                    </Tabs>

                    <CardContent>
                        {children}
                    </CardContent>
                </Card>
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
