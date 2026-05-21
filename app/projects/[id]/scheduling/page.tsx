"use client";

import ScheduleGenerator from '@/app/components/schedule-generator';
import { useProject } from '../ProjectContext';

export default function SchedulingPage() {
    const { project, fetchProject } = useProject();

    if (!project) return null;

    return <ScheduleGenerator project={project} onUpdate={fetchProject} />;
}
