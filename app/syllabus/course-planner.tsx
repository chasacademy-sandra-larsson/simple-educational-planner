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

export default function CoursePlanner({
    programCode,
    orientationCode,
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
                setCourses(data);

                // Initialize all courses as unassigned
                const initialAssignments: CourseAssignment = {};
                data.forEach((course) => {
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

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="mt-8 w-full">
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Course Planning:</strong> Drag and drop courses to assign them to Year 1, 2, or 3.
                        Total program points should be 2,500 (including 200 points for individual choice).
                    </p>
                </div>

                <h2 className="text-xl font-semibold mb-6 text-zinc-900 dark:text-zinc-100">
                    Course Planning
                </h2>

                {/* Side-by-side layout: Unassigned on left, Years 1-3 stacked vertically on right */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Unassigned Courses - left column */}
                    <div className="flex flex-col">
                        <DropZone
                            yearId="unassigned"
                            label={YEAR_LABELS.unassigned}
                            courses={getCoursesByYear("unassigned")}
                            totalPoints={getTotalPoints("unassigned")}
                        />
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
                            />
                        ))}
                    </div>
                </div>
            </div>

            <DragOverlay>
                {activeCourse ? <CourseCard course={activeCourse} isDragging /> : null}
            </DragOverlay>
        </DndContext>
    );
}

interface DropZoneProps {
    yearId: YearId;
    label: string;
    courses: Course[];
    totalPoints: number;
}

function DropZone({ yearId, label, courses, totalPoints }: DropZoneProps) {
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
                        <DraggableCourse key={course.courseCode} course={course} />
                    ))
                )}
            </div>
        </div>
    );
}

interface DraggableCourseProps {
    course: Course;
}

function DraggableCourse({ course }: DraggableCourseProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: course.courseCode,
    });

    const style = transform
        ? {
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={isDragging ? "opacity-50" : ""}
        >
            <CourseCard course={course} />
        </div>
    );
}

interface CourseCardProps {
    course: Course;
    isDragging?: boolean;
}

function CourseCard({ course, isDragging = false }: CourseCardProps) {
    return (
        <div
            className={`
        p-3 rounded-lg border cursor-grab active:cursor-grabbing
        transition-all duration-200
        ${isDragging
                    ? "bg-white dark:bg-zinc-800 border-blue-400 dark:border-blue-600 shadow-lg scale-105"
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
