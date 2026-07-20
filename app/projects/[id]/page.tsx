"use client";

import ControlRoom from '@/app/components/control-room';
import { useProject } from './ProjectContext';

export default function ControlRoomPage() {
    const { project, teachers, rooms } = useProject();

    if (!project) return null;

    return (
        <ControlRoom
            project={project}
            teachers={teachers}
            rooms={rooms}
        />
    );
}
