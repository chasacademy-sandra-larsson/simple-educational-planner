"use client";

import WeeklySchedule from '@/app/components/weekly-schedule';
import { useProject } from '../ProjectContext';

export default function SchedulePage() {
    const { project } = useProject();

    if (!project) return null;

    return <WeeklySchedule project={project} />;
}
