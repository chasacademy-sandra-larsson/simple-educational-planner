"use client";

import TimeSettingsForm from '@/app/components/time-settings-form';
import TermDatesForm from '@/app/components/term-dates-form';
import { useProject } from '../ProjectContext';

export default function SettingsPage() {
    const { project, handleProjectUpdate, fetchProject } = useProject();

    if (!project) return null;

    return (
        <div className="space-y-6">
            <TimeSettingsForm
                project={project}
                onUpdate={handleProjectUpdate}
            />
            <TermDatesForm
                project={project}
                onUpdate={() => fetchProject()}
            />
        </div>
    );
}
