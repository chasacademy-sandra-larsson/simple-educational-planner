"use client";

import { useEffect, useState } from "react";
import { getCoursesByOrientation, Course } from "../lib/syllabus-api";

interface CourseSummaryProps {
    programCode: string;
    orientationCode: string;
}

const CATEGORY_LABELS = {
    FOUNDATIONAL_SUBJECTS: "Grundläggande ämnen",
    PROGRAMME_SPECIFIC_SUBJECTS: "Programgemensamma ämnen",
    ORIENTATION: "Inriktningsämnen",
    INDIVIDUAL_CHOICE: "Individuellt val",
};

export default function CourseSummary({ programCode, orientationCode }: CourseSummaryProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!programCode || !orientationCode) return;

        async function fetchCourses() {
            setLoading(true);
            try {
                const data = await getCoursesByOrientation(programCode, orientationCode);
                // Add Individual Choice
                const allCourses = [
                    ...data,
                    {
                        courseCode: "INDIVIDUAL_CHOICE",
                        name: "Individuellt val",
                        points: 200,
                        category: "INDIVIDUAL_CHOICE" as const,
                    },
                ];
                setCourses(allCourses);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchCourses();
    }, [programCode, orientationCode]);

    if (loading) {
        return <div className="text-sm text-zinc-500">Loading courses...</div>;
    }

    // Group courses by category
    const coursesByCategory = {
        FOUNDATIONAL_SUBJECTS: courses.filter((c) => c.category === "FOUNDATIONAL_SUBJECTS"),
        PROGRAMME_SPECIFIC_SUBJECTS: courses.filter((c) => c.category === "PROGRAMME_SPECIFIC_SUBJECTS"),
        ORIENTATION: courses.filter((c) => c.category === "ORIENTATION"),
        INDIVIDUAL_CHOICE: courses.filter((c) => c.category === "INDIVIDUAL_CHOICE"),
    };

    const totalPoints = courses.reduce((sum, c) => sum + c.points, 0);

    return (
        <div className="space-y-4">
            {/* Total Summary */}
            <div className={`p-3 rounded-lg border ${totalPoints === 2500
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                }`}>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Total Program Points
                    </span>
                    <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${totalPoints === 2500
                            ? "text-green-700 dark:text-green-300"
                            : "text-blue-700 dark:text-blue-300"
                            }`}>
                            {totalPoints}
                        </span>
                        <span className="text-sm text-zinc-500">/ 2500</span>
                        {totalPoints === 2500 && (
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>

            {/* Courses by Category */}
            <div className="space-y-3">
                {Object.entries(coursesByCategory).map(([category, categoryCourses]) => {
                    if (categoryCourses.length === 0) return null;

                    const categoryPoints = categoryCourses.reduce((sum, c) => sum + c.points, 0);

                    return (
                        <div key={category} className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                            <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 flex justify-between items-center">
                                <h5 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                    {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                                </h5>
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    {categoryPoints} points
                                </span>
                            </div>
                            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                {categoryCourses.map((course) => (
                                    <div
                                        key={course.courseCode}
                                        className="px-3 py-2 bg-white dark:bg-zinc-900 flex justify-between items-center"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                                                {course.courseCode}
                                            </div>
                                            <div className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                                {course.name}
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 ml-3">
                                            {course.points}p
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info Note */}
            <div className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                Note: After creating the class, you'll be able to assign these courses to Year 1, 2, or 3 using the course planner.
            </div>
        </div>
    );
}
