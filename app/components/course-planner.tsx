"use client";

import { useEffect, useState } from "react";
import { getCoursesByOrientation, Course } from "../lib/syllabus-api";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";

interface CoursePlannerProps {
    programCode: string;
    orientationCode: string;
    onAssignmentsChange?: (assignments: { courseCode: string; courseName: string; points: number; category: string; year: number }[]) => void;
    readOnly?: boolean;
}

type YearId = "unassigned" | "year1" | "year2" | "year3";

interface CourseAssignment {
    [key: string]: YearId;
}

const YEAR_LABELS = {
    unassigned: "Unassigned Courses",
    year1: "Year 1",
    year2: "Year 2",
    year3: "Year 3",
};

const CATEGORY_LABELS = {
    FOUNDATIONAL_SUBJECTS: "Grundläggande ämnen",
    PROGRAMME_SPECIFIC_SUBJECTS: "Programgemensamma ämnen",
    ORIENTATION: "Inriktningsämnen",
    INDIVIDUAL_CHOICE: "Individuellt val",
};

// Special course for Individual Choice
const INDIVIDUAL_CHOICE_COURSE: Course = {
    courseCode: "INDIVIDUAL_CHOICE",
    name: "Individuellt val",
    points: 200,
    category: "INDIVIDUAL_CHOICE",
};

export default function CoursePlanner({
    programCode,
    orientationCode,
    onAssignmentsChange,
    readOnly = false,
}: CoursePlannerProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<CourseAssignment>({});
    const [activeCourse, setActiveCourse] = useState<Course | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    useEffect(() => {
        if (!programCode || !orientationCode) return;

        async function fetchCourses() {
            setLoading(true);
            setError(null);
            try {
                const data = await getCoursesByOrientation(programCode, orientationCode);
                // Add Individual Choice course to the list
                const allCourses = [...data, INDIVIDUAL_CHOICE_COURSE];
                setCourses(allCourses);

                // Initialize all courses as unassigned
                const initialAssignments: CourseAssignment = {};
                allCourses.forEach((course) => {
                    initialAssignments[course.courseCode] = "unassigned";
                });
                setAssignments(initialAssignments);
            } catch (err) {
                setError("Failed to load courses");
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchCourses();
    }, [programCode, orientationCode]);

    // Notify parent component when assignments change
    useEffect(() => {
        if (!onAssignmentsChange || courses.length === 0) return;

        const yearMapping = {
            'year1': 1,
            'year2': 2,
            'year3': 3,
        } as const;

        const assignedCourses = courses
            .filter(course => assignments[course.courseCode] && assignments[course.courseCode] !== 'unassigned')
            .map(course => ({
                courseCode: course.courseCode,
                courseName: course.name,
                points: course.points,
                category: course.category as string,
                year: yearMapping[assignments[course.courseCode] as 'year1' | 'year2' | 'year3'],
            }));

        onAssignmentsChange(assignedCourses);
    }, [assignments, courses, onAssignmentsChange]);

    const handleDragStart = (event: DragStartEvent) => {
        const courseCode = event.active.id as string;
        const course = courses.find((c) => c.courseCode === courseCode);
        setActiveCourse(course || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCourse(null);

        if (!over) return;

        const courseCode = active.id as string;
        const newYear = over.id as YearId;

        setAssignments((prev) => ({
            ...prev,
            [courseCode]: newYear,
        }));
    };

    const getCoursesByYear = (yearId: YearId): Course[] => {
        return courses.filter((course) => assignments[course.courseCode] === yearId);
    };

    const getTotalPoints = (yearId: YearId): number => {
        return getCoursesByYear(yearId).reduce((sum, course) => sum + course.points, 0);
    };

    const assignedPoints = (["year1", "year2", "year3"] as YearId[]).reduce(
        (sum, year) => sum + getTotalPoints(year),
        0
    );
    const totalPoints = assignedPoints; // Total includes all assigned courses including Individual Choice
    const isValidTotal = totalPoints === 2500;

    if (!programCode || !orientationCode) {
        return null;
    }

    if (loading) {
        return <div className="mt-4 text-zinc-500">Loading courses...</div>;
    }

    if (error) {
        return <div className="mt-4 text-red-500">{error}</div>;
    }

    if (courses.length === 0) {
        return <div className="mt-4 text-zinc-500">No courses found for this program.</div>;
    }

    const content = (
        <div className="mt-8 w-full">
            <div className={`mb-6 p-4 rounded-lg border transition-colors ${isValidTotal
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="text-sm">
                        <p className={isValidTotal ? "text-green-900 dark:text-green-100" : "text-blue-900 dark:text-blue-100"}>
                            <strong>Course Planning:</strong> {readOnly ? 'Viewing assigned courses' : 'Drag and drop courses to assign them to Year 1, 2, or 3'}.
                        </p>
                        <p className={`text-xs mt-1 ${isValidTotal ? "text-green-700 dark:text-green-300" : "text-blue-700 dark:text-blue-300"}`}>
                            (Includes 200 points for Individual Choice)
                        </p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${isValidTotal
                        ? "bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-100"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                        }`}>
                        <span className="font-semibold">Total Points:</span>
                        <span className={`font-bold ${isValidTotal
                            ? "text-green-700 dark:text-green-300"
                            : totalPoints > 2500 ? "text-red-600 dark:text-red-400" : "text-zinc-900 dark:text-zinc-100"
                            }`}>
                            {totalPoints}
                        </span>
                        <span className="text-zinc-400 dark:text-zinc-500">/ 2500</span>
                        {isValidTotal && (
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-semibold mb-6 text-zinc-900 dark:text-zinc-100">
                Course Planning
            </h2>

            {/* Side-by-side layout: Unassigned on left, Years 1-3 stacked vertically on right */}
            <div className="grid grid-cols-2 gap-6">
                {/* Unassigned Courses - left column with categories */}
                <div className="flex flex-col">
                    <UnassignedCoursesByCategory courses={getCoursesByYear("unassigned")} readOnly={readOnly} />
                </div>

                {/* Year 1, 2, 3 - stacked vertically in right column */}
                <div className="flex flex-col gap-6">
                    {(["year1", "year2", "year3"] as YearId[]).map((yearId) => (
                        <DropZone
                            key={yearId}
                            yearId={yearId}
                            label={YEAR_LABELS[yearId]}
                            courses={getCoursesByYear(yearId)}
                            totalPoints={getTotalPoints(yearId)}
                            readOnly={readOnly}
                        />
                    ))}
                </div>
            </div>
        </div>
    );

    return readOnly ? content : (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            {content}
            <DragOverlay>
                {activeCourse ? <CourseCard course={activeCourse} isDragging /> : null}
            </DragOverlay>
        </DndContext>
    );
}

interface UnassignedCoursesByCategoryProps {
    courses: Course[];
    readOnly?: boolean;
}

function UnassignedCoursesByCategory({ courses, readOnly = false }: UnassignedCoursesByCategoryProps) {
    const { setNodeRef } = useDroppable({ id: "unassigned" });

    // Group courses by category
    const coursesByCategory = {
        FOUNDATIONAL_SUBJECTS: courses.filter(c => c.category === "FOUNDATIONAL_SUBJECTS"),
        PROGRAMME_SPECIFIC_SUBJECTS: courses.filter(c => c.category === "PROGRAMME_SPECIFIC_SUBJECTS"),
        ORIENTATION: courses.filter(c => c.category === "ORIENTATION"),
        INDIVIDUAL_CHOICE: courses.filter(c => c.category === "INDIVIDUAL_CHOICE"),
    };

    return (
        <div
            ref={setNodeRef}
            className="rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 p-6 flex flex-col h-full"
        >
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Unassigned Courses
            </h3>

            <div className="space-y-4 flex-1 overflow-y-auto">
                {courses.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-sm">
                        All courses assigned
                    </div>
                ) : (
                    <>
                        {Object.entries(coursesByCategory).map(([category, categoryCourses]) => {
                            if (categoryCourses.length === 0) return null;

                            return (
                                <div key={category} className="mb-4">
                                    <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-2">
                                        {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                                    </h4>
                                    <div className="space-y-2">
                                        {categoryCourses.map((course) => (
                                            <DraggableCourse key={course.courseCode} course={course} readOnly={readOnly} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
}


interface DropZoneProps {
    yearId: YearId;
    label: string;
    courses: Course[];
    totalPoints: number;
    readOnly?: boolean;
}

function DropZone({ yearId, label, courses, totalPoints, readOnly = false }: DropZoneProps) {
    const { setNodeRef } = useDroppable({ id: yearId });

    const isUnassigned = yearId === "unassigned";

    return (
        <div
            ref={setNodeRef}
            className={`
        rounded-xl border-2 border-dashed p-6 flex flex-col
        transition-all duration-200
        ${isUnassigned
                    ? "border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 h-full"
                    : "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 flex-1"
                }
      `}
        >
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {label}
                </h3>
                {!isUnassigned && (
                    <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                            {totalPoints}
                        </span>{" "}
                        points
                    </div>
                )}
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
                {courses.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-sm">
                        {isUnassigned ? "All courses assigned" : "Drop courses here"}
                    </div>
                ) : (
                    courses.map((course) => (
                        <DraggableCourse key={course.courseCode} course={course} readOnly={readOnly} />
                    ))
                )}
            </div>
        </div>
    );
}

interface DraggableCourseProps {
    course: Course;
    readOnly?: boolean;
}

function DraggableCourse({ course, readOnly = false }: DraggableCourseProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: course.courseCode,
        disabled: readOnly,
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

    return (
        <div
            ref={!readOnly ? setNodeRef : undefined}
            style={style}
            {...(!readOnly ? listeners : {})}
            {...(!readOnly ? attributes : {})}
            className={isDragging ? "opacity-50" : ""}
        >
            <CourseCard course={course} readOnly={readOnly} />
        </div>
    );
}

interface CourseCardProps {
    course: Course;
    isDragging?: boolean;
    readOnly?: boolean;
}

function CourseCard({ course, isDragging = false, readOnly = false }: CourseCardProps) {
    return (
        <div
            className={`
        p-3 rounded-lg border ${readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
        transition-all duration-200
        ${isDragging
                    ? "bg-white dark:bg-zinc-800 border-blue-400 dark:border-blue-600 shadow-lg scale-105"
                    : readOnly
                        ? "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                }
      `}
        >
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                        {course.courseCode}
                    </div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {course.name}
                    </div>
                </div>
                <div className="flex-shrink-0 text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {course.points}p
                </div>
            </div>
        </div>
    );
}

// Import useDroppable and useDraggable from dnd-kit
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
