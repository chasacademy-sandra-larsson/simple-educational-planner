"use client";

import ProjectSummary from '@/app/components/project-summary';
import { useProject } from './ProjectContext';

export default function SummaryPage() {
    const { project, teachers, rooms } = useProject();

    if (!project) return null;

    return (
        <ProjectSummary
            project={project}
            teachers={teachers}
            rooms={rooms}
        />
    );
}
