"use client";

import { useEffect, useState } from "react";
import { getOrientations, Orientation } from "../lib/syllabus-api";

interface OrientationSelectorProps {
    programCode: string;
    onSelect: (orientationCode: string) => void;
}

export default function OrientationSelector({ programCode, onSelect }: OrientationSelectorProps) {
    const [orientations, setOrientations] = useState<Orientation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!programCode) {
            setOrientations([]);
            return;
        }

        async function fetchOrientations() {
            setLoading(true);
            setError(null);
            try {
                const data = await getOrientations(programCode);
                setOrientations(data);
            } catch (err) {
                setError("Failed to load orientations");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchOrientations();
    }, [programCode]);

    if (!programCode) {
        return null;
    }

    if (loading) {
        return <div className="text-zinc-500">Loading orientations...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    if (orientations.length === 0) {
        return null; // No orientations for this program
    }

    return (
        <div className="w-full max-w-md">
            <label
                htmlFor="orientation-select"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
            >
                Select Orientation (Inriktning)
            </label>
            <select
                id="orientation-select"
                className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-white sm:text-sm p-2 border"
                onChange={(e) => onSelect(e.target.value)}
                defaultValue=""
            >
                <option value="" disabled>
                    -- Choose an orientation --
                </option>
                {orientations.map((orientation) => (
                    <option key={orientation.code} value={orientation.code}>
                        {orientation.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
