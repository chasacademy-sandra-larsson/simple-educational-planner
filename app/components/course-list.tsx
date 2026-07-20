"use client";

import { useEffect, useState } from "react";
import { getCoursesByOrientation, Course } from "../lib/syllabus-api";

interface CourseListProps {
    programCode: string;
    orientationCode: string;
}

const CATEGORY_LABELS = {
    FOUNDATIONAL_SUBJECTS: "Grundläggande ämnen",
    PROGRAMME_SPECIFIC_SUBJECTS: "Programgemensamma ämnen",
    ORIENTATION: "Inriktningsämnen",
};

export default function CourseList({ programCode, orientationCode }: CourseListProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!programCode || !orientationCode) return;

        async function fetchStructure() {
            setLoading(true);
            setError(null);
            try {
                const data = await getCoursesByOrientation(programCode, orientationCode);
                setCourses(data);
            } catch (err) {
                setError("Failed to load course structure");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchStructure();
    }, [programCode, orientationCode]);

    if (!programCode || !orientationCode) {
        return null;
    }

    if (loading) {
        return <div className="mt-4 text-muted-foreground">Loading courses...</div>;
    }

    if (error) {
        return <div className="mt-4 text-destructive">{error}</div>;
    }

    if (courses.length === 0) {
        return <div className="mt-4 text-muted-foreground">No courses found for this program.</div>;
    }

    // Group courses by category
    const foundationalCourses = courses.filter(c => c.category === "FOUNDATIONAL_SUBJECTS");
    const programmeSpecificCourses = courses.filter(c => c.category === "PROGRAMME_SPECIFIC_SUBJECTS");
    const orientationCourses = courses.filter(c => c.category === "ORIENTATION");

    const renderTable = (title: string, coursesData: Course[]) => {
        if (coursesData.length === 0) return null;

        return (
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                    {title}
                </h3>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                            <tr>
                                <th
                                    scope="col"
                                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6"
                                >
                                    Course Code
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground"
                                >
                                    Course Name
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground"
                                >
                                    Points
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {coursesData.map((course, index) => (
                                <tr key={`${course.courseCode}-${index}`}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                                        {course.courseCode}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                                        {course.name}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                                        {course.points}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="mt-8 w-full">
            <div className="mb-6 p-4 bg-accent rounded-lg border border-primary">
                <p className="text-sm text-primary">
                    <strong>Information:</strong> Totala antalet poäng för ett nationellt gymnasieprogram är 2 500 poäng,
                    varav 200 poäng alltid är avsatta för individuellt val.
                </p>
            </div>

            <h2 className="text-xl font-semibold mb-6 text-foreground">
                Program Structure
            </h2>

            {renderTable(CATEGORY_LABELS.FOUNDATIONAL_SUBJECTS, foundationalCourses)}
            {renderTable(CATEGORY_LABELS.PROGRAMME_SPECIFIC_SUBJECTS, programmeSpecificCourses)}
            {renderTable(CATEGORY_LABELS.ORIENTATION, orientationCourses)}

            {/* Individual Choice Table */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                    Individuellt val
                </h3>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                            <tr>
                                <th
                                    scope="col"
                                    className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-foreground sm:pl-6"
                                >
                                    Course Code
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground"
                                >
                                    Course Name
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-3.5 text-left text-sm font-semibold text-foreground"
                                >
                                    Points
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            <tr>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">
                                    -
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                                    Individuellt val
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                                    200
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
