"use client";

import { useState } from "react";
import ProgramSelector from "./program-selector";
import OrientationSelector from "./orientation-selector";
import CoursePlanner from "./course-planner";

export default function SyllabusPage() {
    const [selectedProgram, setSelectedProgram] = useState<string>("");
    const [selectedOrientation, setSelectedOrientation] = useState<string>("");

    const handleProgramChange = (programCode: string) => {
        setSelectedProgram(programCode);
        setSelectedOrientation(""); // Reset orientation when program changes
    };

    return (
        <div className="flex min-h-screen flex-col items-center bg-zinc-50 dark:bg-black p-8">
            <main className="w-full max-w-4xl flex flex-col items-center gap-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                        Syllabus Explorer
                    </h1>
                    <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
                        Select a high school program to view its course structure and points.
                    </p>
                </div>

                <ProgramSelector onSelect={handleProgramChange} />

                {selectedProgram && (
                    <OrientationSelector
                        programCode={selectedProgram}
                        onSelect={setSelectedOrientation}
                    />
                )}

                {selectedProgram && selectedOrientation && (
                    <CoursePlanner
                        programCode={selectedProgram}
                        orientationCode={selectedOrientation}
                    />
                )}
            </main>
        </div>
    );
}
