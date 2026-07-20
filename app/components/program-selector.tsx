"use client";

import { useEffect, useState } from "react";
import { getPrograms, Program, SCHOOL_TYPE_MAPPING } from "../lib/syllabus-api";

interface ProgramSelectorProps {
    onSelect: (programCode: string) => void;
}

export default function ProgramSelector({ onSelect }: ProgramSelectorProps) {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPrograms() {
            try {
                const data = await getPrograms();
                // Filter to only show Gymnasieskola programs
                const gyPrograms = data.filter((p) => p.schoolTypes?.includes("GY"));
                setPrograms(gyPrograms);
            } catch (err) {
                setError("Failed to load programs");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchPrograms();
    }, []);

    if (loading) {
        return <div className="text-muted-foreground">Loading programs...</div>;
    }

    if (error) {
        return <div className="text-destructive">{error}</div>;
    }

    return (
        <div className="w-full max-w-md">
            <label
                htmlFor="program-select"
                className="block text-sm font-medium text-foreground dark:text-foreground mb-2"
            >
                Select Program (Gymnasieskola)
            </label>
            <select
                id="program-select"
                className="block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring dark:bg-background dark:border-border dark:text-foreground sm:text-sm p-2 border"
                onChange={(e) => onSelect(e.target.value)}
                defaultValue=""
            >
                <option value="" disabled>
                    -- Choose a program --
                </option>
                {programs.map((program) => (
                    <option key={program.code} value={program.code}>
                        {program.name} ({program.code})
                    </option>
                ))}
            </select>
        </div>
    );
}

