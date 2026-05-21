/**
 * Testscript: Kör solvern med alla klasser och kurser för att testa fullskalig
 * schemagenerering. Laddar projektdata, kör preflight-check och genererar schema.
 */
import 'dotenv/config';
import { db } from '../src/db';
import { projects, projectClasses, courseInstances, classCurricula, teachers, rooms, termDates } from '../src/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { generateSchedule, preflightCheck } from '../src/solver';
import { timeToMinutes } from '../src/solver/time-utils';
import { calculateCourseSchedule, parseTermDates, TermDateInfo } from '../src/utils/schedule-calculations';
import { SolverInput, SolverCourse, SolverClass, SolverTeacher, SolverRoom, SolverProjectSettings } from '../src/solver/types';

const DEFAULT_SETTINGS: SolverProjectSettings = {
    earliestLessonStart: 8 * 60,
    latestLessonEnd: 17 * 60,
    defaultLessonDuration: 60,
    minLessonDuration: 40,
    maxLessonDuration: 90,
    lunchDuration: 45,
    earliestLunchTime: 11 * 60 + 30,
    latestLunchTime: 13 * 60 + 30,
    shortestBreakBetweenLessons: 5,
};

async function runTest() {
    const projectId = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';
    const academicYear = '2026/2027';
    const termType: 'fall' | 'spring' = 'fall';

    console.log('Loading data for schedule generation...');

    // Get project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
        console.error('Project not found');
        process.exit(1);
    }

    // Project settings
    const settings: SolverProjectSettings = {
        earliestLessonStart: project.earliestLessonStart ? timeToMinutes(project.earliestLessonStart) : DEFAULT_SETTINGS.earliestLessonStart,
        latestLessonEnd: project.latestLessonEnd ? timeToMinutes(project.latestLessonEnd) : DEFAULT_SETTINGS.latestLessonEnd,
        defaultLessonDuration: project.defaultLessonDuration || DEFAULT_SETTINGS.defaultLessonDuration,
        minLessonDuration: project.minLessonDuration || DEFAULT_SETTINGS.minLessonDuration,
        maxLessonDuration: project.maxLessonDuration || DEFAULT_SETTINGS.maxLessonDuration,
        lunchDuration: project.lunchDuration || DEFAULT_SETTINGS.lunchDuration,
        earliestLunchTime: project.earliestLunchTime ? timeToMinutes(project.earliestLunchTime) : DEFAULT_SETTINGS.earliestLunchTime,
        latestLunchTime: project.latestLunchTime ? timeToMinutes(project.latestLunchTime) : DEFAULT_SETTINGS.latestLunchTime,
        shortestBreakBetweenLessons: project.shortestBreakBetweenLessons || DEFAULT_SETTINGS.shortestBreakBetweenLessons,
    };

    // Load term dates
    const projectTermDates = await db.select().from(termDates).where(eq(termDates.projectId, projectId));
    const termDatesMap = new Map<number, TermDateInfo>();
    for (const td of projectTermDates) {
        termDatesMap.set(td.year, parseTermDates({
            fallTermStart: td.fallTermStart,
            fallTermEnd: td.fallTermEnd,
            springTermStart: td.springTermStart,
            springTermEnd: td.springTermEnd,
        }));
    }
    console.log('Term dates loaded:', termDatesMap.size, 'years');

    // Load classes
    const classesData = await db.select().from(projectClasses).where(eq(projectClasses.projectId, projectId));
    console.log('Classes loaded:', classesData.length);

    const solverClasses: SolverClass[] = classesData.map(c => ({
        id: c.id,
        classCode: c.classCode,
    }));

    // Calculate gymnasium year for each class
    const academicStartYear = parseInt(academicYear.split('/')[0]);
    const classYearMap = new Map<string, number>();
    for (const cls of classesData) {
        const gymnasiumYear = academicStartYear - cls.startYear + 1;
        if (gymnasiumYear >= 1 && gymnasiumYear <= 3) {
            classYearMap.set(cls.id, gymnasiumYear);
        }
    }

    // Load curricula
    const classIds = classesData.map(c => c.id);
    const curricula = await db.select().from(classCurricula).where(inArray(classCurricula.classId, classIds));

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

    // Load course instances
    const curriculumIds = Array.from(activeCurricula.values()).map(c => c.id);
    const instances = curriculumIds.length > 0
        ? await db.select().from(courseInstances).where(inArray(courseInstances.curriculumId, curriculumIds))
        : [];
    console.log('Course instances loaded:', instances.length);

    // Filter and transform courses
    const solverCourses: SolverCourse[] = [];

    for (const instance of instances) {
        const instanceTerms = instance.terms as string[];
        const classGymnasiumYear = classYearMap.get(instance.classId);

        if (!classGymnasiumYear) continue;
        if (instance.year !== classGymnasiumYear) continue;

        // Convert HT/VT to term numbers
        const termOffset = (instance.year - 1) * 2;
        const convertedTerms = instanceTerms.map(t => {
            if (t === 'HT') return `term${termOffset + 1}`;
            if (t === 'VT') return `term${termOffset + 2}`;
            return t;
        });

        const requestedTermNumber = termOffset + (termType === 'fall' ? 1 : 2);
        const requestedTerm = `term${requestedTermNumber}`;

        if (!convertedTerms.includes(requestedTerm)) continue;

        const lessonDuration = instance.lessonDuration || settings.defaultLessonDuration;
        const schedule = calculateCourseSchedule(
            instance.courseCode,
            instance.courseName,
            instance.points,
            convertedTerms,
            termDatesMap,
            lessonDuration
        );

        if (schedule.lessonsPerWeek > 0) {
            solverCourses.push({
                courseInstanceId: instance.id,
                classId: instance.classId,
                courseCode: instance.courseCode,
                courseName: instance.courseName,
                points: instance.points,
                lessonsPerWeek: Math.ceil(schedule.lessonsPerWeek),
                minutesPerWeek: schedule.minutesPerWeek,
                lessonDuration,
                preferredTeacherId: instance.teacherId,
                preferredRoomId: instance.roomId,
            });
        }
    }

    console.log('Courses for solver:', solverCourses.length);

    // Load teachers
    const teachersData = await db.select().from(teachers).where(eq(teachers.projectId, projectId));
    const solverTeachers: SolverTeacher[] = teachersData.map(t => ({
        id: t.id,
        name: t.name,
        subjects: t.subject ? [t.subject] : undefined,
    }));
    console.log('Teachers loaded:', solverTeachers.length);

    // Load rooms
    const roomsData = await db.select().from(rooms).where(eq(rooms.projectId, projectId));
    const solverRooms: SolverRoom[] = roomsData.map(r => ({
        id: r.id,
        roomNumber: r.roomNumber,
        capacity: r.capacity,
        roomType: r.roomType ?? undefined,
        allowedSubjects: r.allowedSubjects as string[] | null,
    }));
    console.log('Rooms loaded:', solverRooms.length);

    const solverInput: SolverInput = {
        projectId,
        academicYear,
        termType,
        courses: solverCourses,
        classes: solverClasses,
        teachers: solverTeachers,
        rooms: solverRooms,
        settings,
    };

    // Preflight check
    const preflight = preflightCheck(solverInput);
    console.log('\nPreflight check:', preflight.valid ? 'PASSED' : 'FAILED');
    if (preflight.issues.length > 0) {
        console.log('Issues:', preflight.issues);
    }

    // Run solver
    console.log('\nRunning solver...');
    const result = await generateSchedule(solverInput);

    console.log('\n=== SOLVER RESULT ===');
    console.log('Success:', result.success);
    console.log('Status:', result.status);
    console.log('Message:', result.message || '(none)');
    console.log('Lessons generated:', result.lessons.length);
    console.log('Solver time:', result.solverTimeMs, 'ms');
    console.log('Total conflicts:', result.totalConflicts);

    if (result.lessons.length > 0) {
        console.log('\nSample lessons:');
        for (const lesson of result.lessons.slice(0, 10)) {
            console.log(`  Day ${lesson.dayOfWeek}: ${lesson.startTime}-${lesson.endTime} - Class ${lesson.classId.substring(0, 8)}`);
        }
    }

    process.exit(result.success ? 0 : 1);
}

runTest().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
