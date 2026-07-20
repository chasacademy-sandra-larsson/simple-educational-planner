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
        return <div className="text-sm text-muted-foreground">Loading courses...</div>;
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
                ? "bg-primary/10 border-primary"
                : "bg-accent border-primary"
                }`}>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">
                        Total Program Points
                    </span>
                    <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${totalPoints === 2500
                            ? "text-primary"
                            : "text-primary"
                            }`}>
                            {totalPoints}
                        </span>
                        <span className="text-sm text-muted-foreground">/ 2500</span>
                        {totalPoints === 2500 && (
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <div key={category} className="border border-border rounded-lg overflow-hidden">
                            <div className="bg-muted px-3 py-2 flex justify-between items-center">
                                <h5 className="text-sm font-semibold text-foreground">
                                    {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                                </h5>
                                <span className="text-sm font-medium text-muted-foreground">
                                    {categoryPoints} points
                                </span>
                            </div>
                            <div className="divide-y divide-border">
                                {categoryCourses.map((course) => (
                                    <div
                                        key={course.courseCode}
                                        className="px-3 py-2 bg-card flex justify-between items-center"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-mono text-muted-foreground">
                                                {course.courseCode}
                                            </div>
                                            <div className="text-sm text-foreground truncate">
                                                {course.name}
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-primary ml-3">
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
            <div className="text-xs text-muted-foreground italic">
                Note: After creating the class, you'll be able to assign these courses to Year 1, 2, or 3 using the course planner.
            </div>
        </div>
    );
}
