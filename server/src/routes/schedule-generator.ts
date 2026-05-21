/**
 * API routes for schedule generation
 */

import { Router, Response } from 'express';
import { db } from '../db';
import {
    projects,
    generatedSchedules,
    scheduledLessons,
    courseInstances,
    projectClasses,
    teachers,
    rooms,
} from '../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
    generateSchedule,
    loadSolverData,
    getAvailableAcademicYears,
    preflightCheck,
} from '../solver';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// POST /projects/:id/schedules/generate - Generate a new schedule
router.post('/projects/:id/schedules/generate', async (req: AuthRequest, res: Response) => {
    try {
        const { id: projectId } = req.params;
        const { name, academicYear, termType, specificTerm } = req.body as {
            name?: string;
            academicYear: string;
            termType: 'fall' | 'spring';
            specificTerm?: string; // Optional: specific term (term1, term2, etc.)
        };

        // Validate input
        if (!academicYear || !termType) {
            return res.status(400).json({ error: 'academicYear and termType are required' });
        }

        if (!['fall', 'spring'].includes(termType)) {
            return res.status(400).json({ error: 'termType must be "fall" or "spring"' });
        }

        // Validate specificTerm if provided
        if (specificTerm && !['term1', 'term2', 'term3', 'term4', 'term5', 'term6'].includes(specificTerm)) {
            return res.status(400).json({ error: 'specificTerm must be one of: term1, term2, term3, term4, term5, term6' });
        }

        // If no specificTerm provided, use the first term of the term type
        // Fall: term1, Spring: term2 (matching "kommande hösttermin och sen vårtermin")
        const defaultSpecificTerm = termType === 'fall' ? 'term1' : 'term2';
        const termToUse = specificTerm || defaultSpecificTerm;

        // Load solver data (also verifies project ownership)
        const termInfo = `${academicYear} ${termType} (${termToUse})`;
        console.log(`[Schedule API] Loading solver data for project ${projectId}, ${termInfo}`);
        const solverInput = await loadSolverData({
            projectId,
            academicYear,
            termType,
            specificTerm: termToUse,
            userId: req.userId!,
        });

        if (!solverInput) {
            console.log('[Schedule API] Project not found or access denied');
            return res.status(404).json({ error: 'Project not found' });
        }

        console.log(`[Schedule API] Loaded ${solverInput.courses.length} courses, ${solverInput.classes.length} classes, ${solverInput.teachers.length} teachers, ${solverInput.rooms.length} rooms`);

        // Preflight check (warnings only, don't block)
        const preflight = preflightCheck(solverInput);
        if (!preflight.valid) {
            console.warn('[Schedule API] Preflight warnings:', preflight.issues);
        }

        // Generate the schedule
        console.log('[Schedule API] Starting schedule generation...');
        const result = await generateSchedule(solverInput);
        console.log(`[Schedule API] Generation complete: success=${result.success}, status=${result.status}, lessons=${result.lessons.length}`);

        // Create the schedule record
        const scheduleName = name || `Schema ${academicYear} ${termType === 'fall' ? 'HT' : 'VT'}`;
        const scheduleStatus = result.success ? 'draft' : 'failed';

        const [newSchedule] = await db.insert(generatedSchedules).values({
            projectId,
            name: scheduleName,
            academicYear,
            termType,
            status: scheduleStatus,
            solverStatus: result.status,
            solverTimeMs: result.solverTimeMs,
            totalConflicts: result.totalConflicts,
        }).returning();

        // Insert scheduled lessons if successful
        if (result.success && result.lessons.length > 0) {
            await db.insert(scheduledLessons).values(
                result.lessons.map(lesson => ({
                    scheduleId: newSchedule.id,
                    courseInstanceId: lesson.courseInstanceId,
                    classId: lesson.classId,
                    teacherId: lesson.teacherId,
                    roomId: lesson.roomId,
                    dayOfWeek: lesson.dayOfWeek,
                    startTime: lesson.startTime,
                    endTime: lesson.endTime,
                    lessonIndex: lesson.lessonIndex,
                    durationMinutes: lesson.durationMinutes,
                }))
            );
        }

        res.status(201).json({
            schedule: newSchedule,
            result: {
                success: result.success,
                status: result.status,
                message: result.message,
                lessonCount: result.lessons.length,
                solverTimeMs: result.solverTimeMs,
                totalConflicts: result.totalConflicts,
            },
        });
    } catch (error) {
        console.error('Generate schedule error:', error);
        res.status(500).json({ error: 'Failed to generate schedule' });
    }
});

// GET /projects/:id/schedules - List all schedules for a project
router.get('/projects/:id/schedules', async (req: AuthRequest, res: Response) => {
    try {
        const { id: projectId } = req.params;

        // Verify project ownership
        const [project] = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get all schedules
        const schedules = await db.select()
            .from(generatedSchedules)
            .where(eq(generatedSchedules.projectId, projectId))
            .orderBy(desc(generatedSchedules.createdAt));

        res.json(schedules);
    } catch (error) {
        console.error('List schedules error:', error);
        res.status(500).json({ error: 'Failed to list schedules' });
    }
});

// GET /projects/:id/schedules/academic-years - Get available academic years
router.get('/projects/:id/schedules/academic-years', async (req: AuthRequest, res: Response) => {
    try {
        const { id: projectId } = req.params;

        const academicYears = await getAvailableAcademicYears(projectId, req.userId!);

        // Return empty array instead of 404 - frontend handles the empty state
        res.json({ academicYears });
    } catch (error) {
        console.error('Get academic years error:', error);
        res.status(500).json({ error: 'Failed to get academic years' });
    }
});

// GET /projects/:id/schedules/:scheduleId - Get a specific schedule with lessons
router.get('/projects/:id/schedules/:scheduleId', async (req: AuthRequest, res: Response) => {
    try {
        const { id: projectId, scheduleId } = req.params;

        // Verify project ownership and get schedule
        const [schedule] = await db.select()
            .from(generatedSchedules)
            .innerJoin(projects, eq(generatedSchedules.projectId, projects.id))
            .where(and(
                eq(generatedSchedules.id, scheduleId),
                eq(generatedSchedules.projectId, projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Get all lessons for this schedule
        const lessons = await db.select()
            .from(scheduledLessons)
            .where(eq(scheduledLessons.scheduleId, scheduleId));

        // Get related data for display
        const courseInstanceIds = [...new Set(lessons.map(l => l.courseInstanceId))];
        const classIds = [...new Set(lessons.map(l => l.classId))];
        const teacherIds = [...new Set(lessons.filter(l => l.teacherId).map(l => l.teacherId!))] as string[];
        const roomIds = [...new Set(lessons.filter(l => l.roomId).map(l => l.roomId!))] as string[];

        const [coursesData, classesData, teachersData, roomsData] = await Promise.all([
            courseInstanceIds.length > 0
                ? db.select().from(courseInstances).where(inArray(courseInstances.id, courseInstanceIds))
                : Promise.resolve([]),
            classIds.length > 0
                ? db.select().from(projectClasses).where(inArray(projectClasses.id, classIds))
                : Promise.resolve([]),
            teacherIds.length > 0
                ? db.select().from(teachers).where(inArray(teachers.id, teacherIds))
                : Promise.resolve([]),
            roomIds.length > 0
                ? db.select().from(rooms).where(inArray(rooms.id, roomIds))
                : Promise.resolve([]),
        ]);

        // Create lookup maps
        const coursesMap = new Map(coursesData.map(c => [c.id, c]));
        const classesMap = new Map(classesData.map(c => [c.id, c]));
        const teachersMap = new Map(teachersData.map(t => [t.id, t]));
        const roomsMap = new Map(roomsData.map(r => [r.id, r]));

        // Enrich lessons with related data
        const enrichedLessons = lessons.map(lesson => {
            const course = coursesMap.get(lesson.courseInstanceId);
            const cls = classesMap.get(lesson.classId);
            const teacher = lesson.teacherId ? teachersMap.get(lesson.teacherId) : null;
            const room = lesson.roomId ? roomsMap.get(lesson.roomId) : null;

            return {
                ...lesson,
                courseCode: course?.courseCode || '',
                courseName: course?.courseName || '',
                classCode: cls?.classCode || '',
                teacherName: teacher?.name || null,
                roomNumber: room?.roomNumber || null,
            };
        });

        res.json({
            schedule: schedule.generated_schedules,
            lessons: enrichedLessons,
        });
    } catch (error) {
        console.error('Get schedule error:', error);
        res.status(500).json({ error: 'Failed to get schedule' });
    }
});

// DELETE /projects/:id/schedules/:scheduleId - Delete a schedule
router.delete('/projects/:id/schedules/:scheduleId', async (req: AuthRequest, res: Response) => {
    try {
        const { id: projectId, scheduleId } = req.params;

        // Verify project ownership
        const [schedule] = await db.select()
            .from(generatedSchedules)
            .innerJoin(projects, eq(generatedSchedules.projectId, projects.id))
            .where(and(
                eq(generatedSchedules.id, scheduleId),
                eq(generatedSchedules.projectId, projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Delete schedule (lessons will cascade)
        await db.delete(generatedSchedules)
            .where(eq(generatedSchedules.id, scheduleId));

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

// PATCH /projects/:id/schedules/:scheduleId/status - Update schedule status
router.patch('/projects/:id/schedules/:scheduleId/status', async (req: AuthRequest, res: Response) => {
    try {
        const { id: projectId, scheduleId } = req.params;
        const { status } = req.body as { status: string };

        // Validate status
        const validStatuses = ['draft', 'approved', 'archived'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
        }

        // Verify project ownership
        const [schedule] = await db.select()
            .from(generatedSchedules)
            .innerJoin(projects, eq(generatedSchedules.projectId, projects.id))
            .where(and(
                eq(generatedSchedules.id, scheduleId),
                eq(generatedSchedules.projectId, projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        // Update status
        const [updated] = await db.update(generatedSchedules)
            .set({ status, updatedAt: new Date() })
            .where(eq(generatedSchedules.id, scheduleId))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error('Update schedule status error:', error);
        res.status(500).json({ error: 'Failed to update schedule status' });
    }
});

export default router;
