/**
 * Data loader for the schedule solver
 * Loads all required data from the database for schedule generation
 */

import { db } from '../db';
import {
    projects,
    projectClasses,
    courseInstances,
    classCurricula,
    teachers,
    rooms,
    termDates,
} from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
    SolverInput,
    SolverCourse,
    SolverClass,
    SolverTeacher,
    SolverRoom,
    SolverProjectSettings,
} from './types';
import { timeToMinutes } from './time-utils';
import {
    calculateCourseSchedule,
    parseTermDates,
    TermDateInfo,
} from '../utils/schedule-calculations';

// Default values for project settings
const DEFAULT_SETTINGS: SolverProjectSettings = {
    earliestLessonStart: 8 * 60, // 08:00
    latestLessonEnd: 17 * 60, // 17:00
    defaultLessonDuration: 60, // 60 minutes (used for calculations)
    minLessonDuration: 40, // 40 minutes minimum
    maxLessonDuration: 90, // 90 minutes maximum
    lunchDuration: 45, // 45 minutes
    earliestLunchTime: 11 * 60 + 30, // 11:30
    latestLunchTime: 13 * 60 + 30, // 13:30
    shortestBreakBetweenLessons: 5, // 5 minutes
};

interface LoadOptions {
    projectId: string;
    academicYear: string;
    termType: 'fall' | 'spring';
    specificTerm?: string;
    userId: string;
}

/**
 * Get the specific term for a class based on their start year and the academic year being scheduled
 *
 * Example: Class starts 2026, scheduling for 2026/2027 fall → term1 (year 1 fall)
 *          Class starts 2026, scheduling for 2027/2028 fall → term3 (year 2 fall)
 *          Class starts 2025, scheduling for 2026/2027 fall → term3 (year 2 fall)
 */
function getTermForClass(classStartYear: number, academicYear: string, termType: 'fall' | 'spring'): string | null {
    // Parse academic year (e.g., "2026/2027" → 2026)
    const academicStartYear = parseInt(academicYear.split('/')[0]);

    // Calculate which gymnasium year this class is in during this academic year
    const gymnasiumYear = academicStartYear - classStartYear + 1;

    // Only valid for years 1-3
    if (gymnasiumYear < 1 || gymnasiumYear > 3) {
        return null; // Class hasn't started yet or has graduated
    }

    // Map to term number
    // Year 1: term1 (fall), term2 (spring)
    // Year 2: term3 (fall), term4 (spring)
    // Year 3: term5 (fall), term6 (spring)
    const termNumber = (gymnasiumYear - 1) * 2 + (termType === 'fall' ? 1 : 2);
    return `term${termNumber}`;
}

/**
 * Load all data required for the solver from the database
 */
export async function loadSolverData(options: LoadOptions): Promise<SolverInput | null> {
    const { projectId, academicYear, termType, specificTerm, userId } = options;

    // 1. Load and verify project ownership
    const [project] = await db.select()
        .from(projects)
        .where(and(
            eq(projects.id, projectId),
            eq(projects.userId, userId)
        ))
        .limit(1);

    if (!project) {
        return null;
    }

    // 2. Load project settings
    const settings: SolverProjectSettings = {
        earliestLessonStart: project.earliestLessonStart
            ? timeToMinutes(project.earliestLessonStart)
            : DEFAULT_SETTINGS.earliestLessonStart,
        latestLessonEnd: project.latestLessonEnd
            ? timeToMinutes(project.latestLessonEnd)
            : DEFAULT_SETTINGS.latestLessonEnd,
        defaultLessonDuration: project.defaultLessonDuration || DEFAULT_SETTINGS.defaultLessonDuration,
        minLessonDuration: project.minLessonDuration || DEFAULT_SETTINGS.minLessonDuration,
        maxLessonDuration: project.maxLessonDuration || DEFAULT_SETTINGS.maxLessonDuration,
        lunchDuration: project.lunchDuration || DEFAULT_SETTINGS.lunchDuration,
        earliestLunchTime: project.earliestLunchTime
            ? timeToMinutes(project.earliestLunchTime)
            : DEFAULT_SETTINGS.earliestLunchTime,
        latestLunchTime: project.latestLunchTime
            ? timeToMinutes(project.latestLunchTime)
            : DEFAULT_SETTINGS.latestLunchTime,
        shortestBreakBetweenLessons: project.shortestBreakBetweenLessons || DEFAULT_SETTINGS.shortestBreakBetweenLessons,
    };

    // 3. Load term dates for calculating lessons per week
    const projectTermDates = await db.select()
        .from(termDates)
        .where(eq(termDates.projectId, projectId));

    const termDatesMap = new Map<number, TermDateInfo>();
    for (const td of projectTermDates) {
        termDatesMap.set(td.year, parseTermDates({
            fallTermStart: td.fallTermStart,
            fallTermEnd: td.fallTermEnd,
            springTermStart: td.springTermStart,
            springTermEnd: td.springTermEnd,
        }));
    }

    // 4. Load classes
    const classesData = await db.select()
        .from(projectClasses)
        .where(eq(projectClasses.projectId, projectId));

    if (classesData.length === 0) {
        return {
            projectId,
            academicYear,
            termType,
            courses: [],
            classes: [],
            teachers: [],
            rooms: [],
            settings,
        };
    }

    const solverClasses: SolverClass[] = classesData.map(c => ({
        id: c.id,
        classCode: c.classCode,
    }));

    // 5. Load curricula for all classes
    const classIds = classesData.map(c => c.id);
    const curricula = await db.select()
        .from(classCurricula)
        .where(inArray(classCurricula.classId, classIds));

    // Get active curricula (one per class)
    const activeCurricula = new Map<string, typeof curricula[0]>();
    for (const c of classesData) {
        const classCurr = curricula
            .filter(curr => curr.classId === c.id && (curr.status === 'approved' || curr.status === 'draft'))
            .sort((a, b) => {
                if (a.status === 'approved' && b.status === 'draft') return -1;
                if (a.status === 'draft' && b.status === 'approved') return 1;
                return b.version - a.version;
            })[0];
        if (classCurr) {
            activeCurricula.set(c.id, classCurr);
        }
    }

    // 6. Load course instances for active curricula
    const curriculumIds = Array.from(activeCurricula.values()).map(c => c.id);
    const instances = curriculumIds.length > 0
        ? await db.select()
            .from(courseInstances)
            .where(inArray(courseInstances.curriculumId, curriculumIds))
        : [];

    // 7. Filter courses by academic year + term type and calculate lessons per week
    // Create a map of class ID to their gymnasium year for this academic year
    const classYearMap = new Map<string, number>();
    for (const cls of classesData) {
        const academicStartYear = parseInt(academicYear.split('/')[0]);
        const gymnasiumYear = academicStartYear - cls.startYear + 1;
        if (gymnasiumYear >= 1 && gymnasiumYear <= 3) {
            classYearMap.set(cls.id, gymnasiumYear);
        }
    }

    const solverCourses: SolverCourse[] = [];

    for (const instance of instances) {
        const instanceTerms = instance.terms as string[];

        // Get the gymnasium year this class is in for the given academic year
        const classGymnasiumYear = classYearMap.get(instance.classId);
        if (!classGymnasiumYear) {
            continue; // Class is not active in this academic year
        }

        // Check if this course should be taken by this class in this academic year
        // Course's year field indicates which gymnasium year it's taken in
        if (instance.year !== classGymnasiumYear) {
            continue; // This course is not for this class's current year
        }

        // Convert HT/VT to term numbers based on the course's year
        // Year 1: HT=term1, VT=term2
        // Year 2: HT=term3, VT=term4
        // Year 3: HT=term5, VT=term6
        const termOffset = (instance.year - 1) * 2;
        const convertedTerms = instanceTerms.map(t => {
            if (t === 'HT') return `term${termOffset + 1}`;
            if (t === 'VT') return `term${termOffset + 2}`;
            return t; // Already in termN format
        });

        // Check if this course runs in the requested term type
        const requestedTermNumber = termOffset + (termType === 'fall' ? 1 : 2);
        const requestedTerm = `term${requestedTermNumber}`;

        if (!convertedTerms.includes(requestedTerm)) {
            continue; // This course doesn't run in this term
        }

        // Calculate lessons per week for this term
        // Use ALL terms the course runs (convertedTerms) to calculate the correct weekly rate,
        // not just relevantInstanceTerms. A course spanning term1+term2 (39 weeks) should
        // have its hours distributed over all 39 weeks, not just the 17 fall weeks.
        const lessonDuration = instance.lessonDuration || settings.defaultLessonDuration;
        const schedule = calculateCourseSchedule(
            instance.courseCode,
            instance.courseName,
            instance.points,
            convertedTerms,
            termDatesMap,
            lessonDuration
        );

        // Only include courses that need at least one lesson per week
        if (schedule.lessonsPerWeek > 0) {
            solverCourses.push({
                courseInstanceId: instance.id,
                classId: instance.classId,
                courseCode: instance.courseCode,
                courseName: instance.courseName,
                points: instance.points,
                lessonsPerWeek: Math.ceil(schedule.lessonsPerWeek), // Round up for scheduling
                minutesPerWeek: schedule.minutesPerWeek, // Original minutes per week (for diagnostics)
                lessonDuration,
                preferredTeacherId: instance.teacherId,
                preferredRoomId: instance.roomId,
            });
        }
    }

    // 8. Load teachers
    const teachersData = await db.select()
        .from(teachers)
        .where(eq(teachers.projectId, projectId));

    const solverTeachers: SolverTeacher[] = teachersData.map(t => ({
        id: t.id,
        name: t.name,
        subjects: t.subject ? [t.subject] : undefined,
    }));

    // 9. Load rooms
    const roomsData = await db.select()
        .from(rooms)
        .where(eq(rooms.projectId, projectId));

    const solverRooms: SolverRoom[] = roomsData.map(r => ({
        id: r.id,
        roomNumber: r.roomNumber,
        capacity: r.capacity,
        roomType: r.roomType ?? undefined,
        allowedSubjects: r.allowedSubjects as string[] | null,
    }));

    return {
        projectId,
        academicYear,
        termType,
        courses: solverCourses,
        classes: solverClasses,
        teachers: solverTeachers,
        rooms: solverRooms,
        settings,
    };
}

/**
 * Get available academic years for a project based on its classes
 */
export async function getAvailableAcademicYears(projectId: string, userId: string): Promise<string[]> {
    // Verify project ownership
    const [project] = await db.select()
        .from(projects)
        .where(and(
            eq(projects.id, projectId),
            eq(projects.userId, userId)
        ))
        .limit(1);

    if (!project) {
        return [];
    }

    // Get all classes for the project
    const classes = await db.select()
        .from(projectClasses)
        .where(eq(projectClasses.projectId, projectId));

    if (classes.length === 0) {
        return [];
    }

    // Calculate academic years based on class start/graduation years
    const academicYears = new Set<string>();
    for (const cls of classes) {
        for (let year = cls.startYear; year < cls.graduationYear; year++) {
            academicYears.add(`${year}/${year + 1}`);
        }
    }

    return Array.from(academicYears).sort();
}
