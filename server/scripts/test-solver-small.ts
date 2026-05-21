/**
 * Testscript: Kör solvern med en liten delmängd (3 klasser, max 8 kurser/klass)
 * för att snabbt verifiera att schemagenerering fungerar.
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
    const MAX_CLASSES = 3; // Only use 3 classes
    const MAX_COURSES_PER_CLASS = 8; // Limit courses per class

    console.log(`Testing with ${MAX_CLASSES} classes, max ${MAX_COURSES_PER_CLASS} courses each\n`);

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
        console.error('Project not found');
        process.exit(1);
    }

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

    // Only get first few classes (first year only)
    const allClasses = await db.select().from(projectClasses).where(eq(projectClasses.projectId, projectId));
    const academicStartYear = parseInt(academicYear.split('/')[0]);
    const year1Classes = allClasses.filter(c => (academicStartYear - c.startYear + 1) === 1);
    const classesData = year1Classes.slice(0, MAX_CLASSES);
    console.log(`Using ${classesData.length} year-1 classes:`, classesData.map(c => c.classCode).join(', '));

    const solverClasses: SolverClass[] = classesData.map(c => ({
        id: c.id,
        classCode: c.classCode,
    }));

    const classYearMap = new Map<string, number>();
    for (const cls of classesData) {
        const gymnasiumYear = academicStartYear - cls.startYear + 1;
        classYearMap.set(cls.id, gymnasiumYear);
    }

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

    const curriculumIds = Array.from(activeCurricula.values()).map(c => c.id);
    const instances = curriculumIds.length > 0
        ? await db.select().from(courseInstances).where(inArray(courseInstances.curriculumId, curriculumIds))
        : [];

    // Track courses per class to limit them
    const coursesPerClass = new Map<string, number>();
    const solverCourses: SolverCourse[] = [];

    for (const instance of instances) {
        const instanceTerms = instance.terms as string[];
        const classGymnasiumYear = classYearMap.get(instance.classId);

        if (!classGymnasiumYear) continue;
        if (instance.year !== classGymnasiumYear) continue;

        // Limit courses per class
        const currentCount = coursesPerClass.get(instance.classId) || 0;
        if (currentCount >= MAX_COURSES_PER_CLASS) continue;
        coursesPerClass.set(instance.classId, currentCount + 1);

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

    console.log(`Courses for solver: ${solverCourses.length}`);
    const totalLessons = solverCourses.reduce((sum, c) => sum + c.lessonsPerWeek, 0);
    console.log(`Total lessons per week: ${totalLessons}\n`);

    const teachersData = await db.select().from(teachers).where(eq(teachers.projectId, projectId));
    const solverTeachers: SolverTeacher[] = teachersData.map(t => ({
        id: t.id,
        name: t.name,
        subjects: t.subject ? [t.subject] : undefined,
    }));

    const roomsData = await db.select().from(rooms).where(eq(rooms.projectId, projectId));
    const solverRooms: SolverRoom[] = roomsData.map(r => ({
        id: r.id,
        roomNumber: r.roomNumber,
        capacity: r.capacity,
        roomType: r.roomType ?? undefined,
        allowedSubjects: r.allowedSubjects as string[] | null,
    }));

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

    const preflight = preflightCheck(solverInput);
    console.log('Preflight check:', preflight.valid ? 'PASSED' : 'FAILED');
    if (preflight.issues.length > 0) {
        console.log('Issues:', preflight.issues);
    }

    console.log('\nRunning solver...');
    const result = await generateSchedule(solverInput);

    console.log('\n=== SOLVER RESULT ===');
    console.log('Success:', result.success);
    console.log('Status:', result.status);
    console.log('Message:', result.message || '(none)');
    console.log('Lessons generated:', result.lessons.length);
    console.log('Solver time:', result.solverTimeMs, 'ms');

    if (result.lessons.length > 0) {
        console.log('\nSample lessons:');
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        for (const lesson of result.lessons.slice(0, 15)) {
            const cls = solverClasses.find(c => c.id === lesson.classId);
            const course = solverCourses.find(c => c.courseInstanceId === lesson.courseInstanceId);
            console.log(`  ${dayNames[lesson.dayOfWeek]}: ${lesson.startTime}-${lesson.endTime} | ${cls?.classCode || '?'} | ${course?.courseCode || '?'}`);
        }
    }

    process.exit(result.success ? 0 : 1);
}

runTest().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
