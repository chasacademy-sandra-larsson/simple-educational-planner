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
        return <div className="text-zinc-500">Loading programs...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div className="w-full max-w-md">
            <label
                htmlFor="program-select"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
                Select Program (Gymnasieskola)
            </label>
            <select
                id="program-select"
                className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white sm:text-sm p-2 border"
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

