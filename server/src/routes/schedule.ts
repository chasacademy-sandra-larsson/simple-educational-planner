import { Router, Response } from 'express';
import { db } from '../db';
import { projects, projectClasses, courseInstances, classCurricula, termDates } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
    calculateCourseSchedule,
    parseTermDates,
    TermDateInfo,
    CourseScheduleCalculation,
} from '../utils/schedule-calculations';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

interface ClassScheduleInfo {
    classId: string;
    classCode: string;
    programName: string;
    startYear: number;
    courses: CourseScheduleCalculation[];
    totalMinutesPerWeek: number;
}

interface ProjectScheduleCalculation {
    projectId: string;
    projectName: string;
    defaultLessonDuration: number;
    classes: ClassScheduleInfo[];
    termDatesAvailable: boolean;
    missingTermDates: { year: number; academicYear: string }[];
}

// Helper function to get relevant terms for a term type
function getTermsForTermType(termType: 'fall' | 'spring'): string[] {
    if (termType === 'fall') {
        return ['term1', 'term3', 'term5'];
    }
    return ['term2', 'term4', 'term6'];
}

// Calculate minutes per week for all courses in a project
// Query params:
//   - termType: 'fall' | 'spring' (optional, filters to show only courses for that term type)
router.get('/projects/:projectId/schedule/calculate', async (req: AuthRequest, res: Response) => {
    try {
        const termType = req.query.termType as 'fall' | 'spring' | undefined;
        const relevantTerms = termType ? getTermsForTermType(termType) : null;

        // Verify project ownership and get project data
        const [project] = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, req.params.projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const defaultLessonDuration = project.defaultLessonDuration || 60;

        // Get all classes for the project
        const classes = await db.select()
            .from(projectClasses)
            .where(eq(projectClasses.projectId, req.params.projectId));

        if (classes.length === 0) {
            return res.json({
                projectId: project.id,
                projectName: project.name,
                defaultLessonDuration,
                classes: [],
                termDatesAvailable: false,
                missingTermDates: [],
            } as ProjectScheduleCalculation);
        }

        // Get all curricula for these classes
        const classIds = classes.map(c => c.id);
        const curricula = await db.select()
            .from(classCurricula)
            .where(inArray(classCurricula.classId, classIds));

        // Get all course instances
        const curriculumIds = curricula.map(c => c.id);
        const instances = curriculumIds.length > 0
            ? await db.select()
                .from(courseInstances)
                .where(inArray(courseInstances.curriculumId, curriculumIds))
            : [];

        // Get term dates for the project
        const projectTermDates = await db.select()
            .from(termDates)
            .where(eq(termDates.projectId, req.params.projectId));

        // Create a map of term dates by gymnasium year
        const termDatesMap = new Map<number, TermDateInfo>();
        for (const td of projectTermDates) {
            termDatesMap.set(td.year, parseTermDates({
                fallTermStart: td.fallTermStart,
                fallTermEnd: td.fallTermEnd,
                springTermStart: td.springTermStart,
                springTermEnd: td.springTermEnd,
            }));
        }

        // Track missing term dates
        const missingTermDates: { year: number; academicYear: string }[] = [];
        const neededYears = new Set<number>();

        // Calculate schedule for each class
        const classSchedules: ClassScheduleInfo[] = [];

        for (const cls of classes) {
            // Find active curriculum for this class
            const activeCurriculum = curricula
                .filter(c => c.classId === cls.id && (c.status === 'approved' || c.status === 'draft'))
                .sort((a, b) => {
                    if (a.status === 'approved' && b.status === 'draft') return -1;
                    if (a.status === 'draft' && b.status === 'approved') return 1;
                    return b.version - a.version;
                })[0];

            if (!activeCurriculum) {
                classSchedules.push({
                    classId: cls.id,
                    classCode: cls.classCode,
                    programName: cls.programName,
                    startYear: cls.startYear,
                    courses: [],
                    totalMinutesPerWeek: 0,
                });
                continue;
            }

            // Get courses for this curriculum
            const classCourses = instances.filter(ci => ci.curriculumId === activeCurriculum.id);

            // Track which years we need term dates for
            for (const course of classCourses) {
                const terms = course.terms as string[];
                for (const term of terms) {
                    const termYear = Math.ceil(parseInt(term.replace('term', '')) / 2);
                    neededYears.add(termYear);
                }
            }

            // Calculate schedule for each course
            // If termType is specified, only include courses that run in that term type
            const courseSchedules: CourseScheduleCalculation[] = [];
            let totalMinutesPerWeek = 0;

            for (const course of classCourses) {
                const terms = course.terms as string[];

                // If filtering by termType, skip courses that don't run in any relevant term
                if (relevantTerms) {
                    const hasRelevantTerm = terms.some(t => relevantTerms.includes(t));
                    if (!hasRelevantTerm) {
                        continue;
                    }
                }

                const courseLessonDuration = course.lessonDuration || defaultLessonDuration;

                const schedule = calculateCourseSchedule(
                    course.courseCode,
                    course.courseName,
                    course.points,
                    terms,
                    termDatesMap,
                    courseLessonDuration
                );

                courseSchedules.push(schedule);
                totalMinutesPerWeek += schedule.minutesPerWeek;
            }

            classSchedules.push({
                classId: cls.id,
                classCode: cls.classCode,
                programName: cls.programName,
                startYear: cls.startYear,
                courses: courseSchedules,
                totalMinutesPerWeek,
            });
        }

        // Check for missing term dates
        for (const year of neededYears) {
            if (!termDatesMap.has(year)) {
                // Calculate academic year based on first class's start year
                const firstClass = classes[0];
                const academicStartYear = firstClass.startYear + year - 1;
                missingTermDates.push({
                    year,
                    academicYear: `${academicStartYear}/${academicStartYear + 1}`,
                });
            }
        }

        const result: ProjectScheduleCalculation = {
            projectId: project.id,
            projectName: project.name,
            defaultLessonDuration,
            classes: classSchedules,
            termDatesAvailable: missingTermDates.length === 0 && projectTermDates.length > 0,
            missingTermDates,
        };

        res.json(result);
    } catch (error) {
        console.error('Calculate schedule error:', error);
        res.status(500).json({ error: 'Failed to calculate schedule' });
    }
});

// Get schedule calculation for a specific class
// Query params:
//   - termType: 'fall' | 'spring' (optional, filters to show only courses for that term type)
router.get('/projects/:projectId/classes/:classId/schedule', async (req: AuthRequest, res: Response) => {
    try {
        const termType = req.query.termType as 'fall' | 'spring' | undefined;
        const relevantTerms = termType ? getTermsForTermType(termType) : null;

        // Verify project ownership
        const [project] = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, req.params.projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get the class
        const [cls] = await db.select()
            .from(projectClasses)
            .where(and(
                eq(projectClasses.id, req.params.classId),
                eq(projectClasses.projectId, req.params.projectId)
            ))
            .limit(1);

        if (!cls) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const defaultLessonDuration = project.defaultLessonDuration || 60;

        // Get curriculum
        const [curriculum] = await db.select()
            .from(classCurricula)
            .where(and(
                eq(classCurricula.classId, cls.id),
                eq(classCurricula.status, 'draft')
            ))
            .limit(1);

        if (!curriculum) {
            return res.json({
                classId: cls.id,
                classCode: cls.classCode,
                programName: cls.programName,
                startYear: cls.startYear,
                courses: [],
                totalMinutesPerWeek: 0,
                termDatesAvailable: false,
            });
        }

        // Get courses
        const courses = await db.select()
            .from(courseInstances)
            .where(eq(courseInstances.curriculumId, curriculum.id));

        // Get term dates
        const projectTermDates = await db.select()
            .from(termDates)
            .where(eq(termDates.projectId, req.params.projectId));

        const termDatesMap = new Map<number, TermDateInfo>();
        for (const td of projectTermDates) {
            termDatesMap.set(td.year, parseTermDates({
                fallTermStart: td.fallTermStart,
                fallTermEnd: td.fallTermEnd,
                springTermStart: td.springTermStart,
                springTermEnd: td.springTermEnd,
            }));
        }

        // Calculate schedule for each course
        // If termType is specified, only include courses that run in that term type
        const courseSchedules: CourseScheduleCalculation[] = [];
        let totalMinutesPerWeek = 0;

        for (const course of courses) {
            const terms = course.terms as string[];

            // If filtering by termType, skip courses that don't run in any relevant term
            if (relevantTerms) {
                const hasRelevantTerm = terms.some(t => relevantTerms.includes(t));
                if (!hasRelevantTerm) {
                    continue;
                }
            }

            const courseLessonDuration = course.lessonDuration || defaultLessonDuration;

            const schedule = calculateCourseSchedule(
                course.courseCode,
                course.courseName,
                course.points,
                terms,
                termDatesMap,
                courseLessonDuration
            );

            courseSchedules.push(schedule);
            totalMinutesPerWeek += schedule.minutesPerWeek;
        }

        res.json({
            classId: cls.id,
            classCode: cls.classCode,
            programName: cls.programName,
            startYear: cls.startYear,
            courses: courseSchedules,
            totalMinutesPerWeek,
            termDatesAvailable: termDatesMap.size > 0,
        });
    } catch (error) {
        console.error('Get class schedule error:', error);
        res.status(500).json({ error: 'Failed to get class schedule' });
    }
});

export default router;
