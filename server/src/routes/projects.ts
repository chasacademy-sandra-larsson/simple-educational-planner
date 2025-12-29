import { Router, Response } from 'express';
import { db } from '../db';
import { projects, projectClasses, courseInstances, classCurricula } from '../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { CreateProjectRequest, CreateClassRequest, UpdateCurriculumRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all projects for the logged-in user
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const userProjects = await db.select()
            .from(projects)
            .where(eq(projects.userId, req.userId!))
            .orderBy(desc(projects.createdAt));

        res.json(userProjects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Get a single project with all related data
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const [project] = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, req.params.id),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get classes for this project
        const classes = await db.select()
            .from(projectClasses)
            .where(eq(projectClasses.projectId, project.id));

        // Get curricula for all classes
        const classIds = classes.map(c => c.id);
        const curricula = classIds.length > 0
            ? await db.select()
                .from(classCurricula)
                .where(inArray(classCurricula.classId, classIds))
            : [];

        // Get course instances for all curricula
        const curriculumIds = curricula.map(c => c.id);
        const instances = curriculumIds.length > 0
            ? await db.select()
                .from(courseInstances)
                .where(inArray(courseInstances.curriculumId, curriculumIds))
            : [];

        // Group by class and find active curriculum (draft or approved)
        const classesWithCourses = classes.map(cls => {
            // Find active curriculum (prefer approved, fallback to draft)
            const activeCurriculum = curricula
                .filter(c => c.classId === cls.id && (c.status === 'approved' || c.status === 'draft'))
                .sort((a, b) => {
                    // Prefer approved over draft
                    if (a.status === 'approved' && b.status === 'draft') return -1;
                    if (a.status === 'draft' && b.status === 'approved') return 1;
                    // If same status, prefer latest version
                    return b.version - a.version;
                })[0];

            if (!activeCurriculum) {
                return { ...cls, curriculum: null };
            }

            const classCourses = instances
                .filter(ci => ci.curriculumId === activeCurriculum.id)
                .map(ci => ({
                    id: ci.id, // Include course instance ID
                    courseCode: ci.courseCode,
                    courseName: ci.courseName,
                    points: ci.points,
                    category: ci.category,
                    year: ci.year,
                    terms: ci.terms,
                }));
            
            return {
                ...cls,
                curriculum: {
                    id: activeCurriculum.id,
                    courses: classCourses,
                    totalPoints: activeCurriculum.totalPoints,
                    isValid: activeCurriculum.isValid,
                    status: activeCurriculum.status,
                    version: activeCurriculum.version,
                },
            };
        });

        res.json({ ...project, classes: classesWithCourses });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// Create a new project
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { 
            name, 
            description,
            earliestLessonStart,
            latestLessonEnd,
            defaultLessonDuration,
            mentorTimePerWeek,
            lunchDuration,
            earliestLunchTime,
            latestLunchTime,
            shortestBreakBetweenLessons,
            longestBreakBetweenLessons
        } = req.body;

        const [newProject] = await db.insert(projects).values({
            userId: req.userId!,
            name,
            description,
            earliestLessonStart: earliestLessonStart || null,
            latestLessonEnd: latestLessonEnd || null,
            defaultLessonDuration: defaultLessonDuration || null,
            mentorTimePerWeek: mentorTimePerWeek || null,
            lunchDuration: lunchDuration || null,
            earliestLunchTime: earliestLunchTime || null,
            latestLunchTime: latestLunchTime || null,
            shortestBreakBetweenLessons: shortestBreakBetweenLessons || null,
            longestBreakBetweenLessons: longestBreakBetweenLessons || null,
        }).returning();

        res.status(201).json(newProject);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Update a project
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { 
            name, 
            description,
            earliestLessonStart,
            latestLessonEnd,
            defaultLessonDuration,
            mentorTimePerWeek,
            lunchDuration,
            earliestLunchTime,
            latestLunchTime,
            shortestBreakBetweenLessons,
            longestBreakBetweenLessons
        } = req.body;

        const [updatedProject] = await db.update(projects)
            .set({
                name,
                description,
                earliestLessonStart: earliestLessonStart || null,
                latestLessonEnd: latestLessonEnd || null,
                defaultLessonDuration: defaultLessonDuration || null,
                mentorTimePerWeek: mentorTimePerWeek || null,
                lunchDuration: lunchDuration || null,
                earliestLunchTime: earliestLunchTime || null,
                latestLunchTime: latestLunchTime || null,
                shortestBreakBetweenLessons: shortestBreakBetweenLessons || null,
                longestBreakBetweenLessons: longestBreakBetweenLessons || null,
                updatedAt: new Date(),
            })
            .where(and(
                eq(projects.id, req.params.id),
                eq(projects.userId, req.userId!)
            ))
            .returning();

        if (!updatedProject) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(updatedProject);
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Delete a project
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const [deletedProject] = await db.delete(projects)
            .where(and(
                eq(projects.id, req.params.id),
                eq(projects.userId, req.userId!)
            ))
            .returning();

        if (!deletedProject) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// Add a class to a project
router.post('/:id/classes', async (req: AuthRequest, res: Response) => {
    try {
        const { classCode, programCode, programName, orientationCode, orientationName, startYear } = req.body;

        // Verify project ownership (only need id, so minimal select)
        const projectData = await db.select({ id: projects.id })
            .from(projects)
            .where(and(
                eq(projects.id, req.params.id),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (projectData.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const graduationYear = startYear + 3;

        const [newClass] = await db.insert(projectClasses).values({
            projectId: req.params.id,
            classCode,
            programCode,
            programName,
            orientationCode,
            orientationName,
            startYear,
            graduationYear,
        }).returning();

        res.status(201).json(newClass);
    } catch (error) {
        console.error('Add class error:', error);
        res.status(500).json({ error: 'Failed to add class' });
    }
});

// Delete a class
router.delete('/classes/:classId', async (req: AuthRequest, res: Response) => {
    try {
        // Get class with project info to verify ownership
        const classData = await db.select()
            .from(projectClasses)
            .where(eq(projectClasses.id, req.params.classId))
            .limit(1);

        if (classData.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const classToDelete = classData[0];

        // Verify project ownership
        const projectData = await db.select()
            .from(projects)
            .where(eq(projects.id, classToDelete.projectId))
            .limit(1);

        if (projectData.length === 0 || projectData[0].userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await db.delete(projectClasses).where(eq(projectClasses.id, req.params.classId));

        res.json({ message: 'Class deleted successfully' });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({ error: 'Failed to delete class' });
    }
});

// Update curriculum for a class
router.put('/classes/:classId/curriculum', async (req: AuthRequest, res: Response) => {
    try {
        const { courses } = req.body;
        const classId = req.params.classId;

        // Verify class exists and user has access
        const classData = await db.select()
            .from(projectClasses)
            .where(eq(projectClasses.id, classId))
            .limit(1);

        if (classData.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }

        // Verify project ownership
        const projectData = await db.select()
            .from(projects)
            .where(eq(projects.id, classData[0].projectId))
            .limit(1);

        if (projectData.length === 0 || projectData[0].userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Calculate total points
        const totalPoints = courses.reduce((sum: number, course: any) => sum + course.points, 0);
        const isValid = totalPoints === 2500 ? 1 : 0;

        // Find existing draft curriculum or create new one
        const existingCurricula = await db.select()
            .from(classCurricula)
            .where(and(
                eq(classCurricula.classId, classId),
                eq(classCurricula.status, 'draft')
            ))
            .orderBy(desc(classCurricula.version))
            .limit(1);

        let curriculum;
        if (existingCurricula.length > 0) {
            // Update existing draft curriculum
            const [updatedCurriculum] = await db.update(classCurricula)
                .set({
                    totalPoints,
                    isValid,
                    updatedAt: new Date(),
                })
                .where(eq(classCurricula.id, existingCurricula[0].id))
                .returning();
            curriculum = updatedCurriculum;
        } else {
            // Create new curriculum
            // Get next version number
            const allCurricula = await db.select()
                .from(classCurricula)
                .where(eq(classCurricula.classId, classId))
                .orderBy(desc(classCurricula.version))
                .limit(1);
            
            const nextVersion = allCurricula.length > 0 ? allCurricula[0].version + 1 : 1;

            const [newCurriculum] = await db.insert(classCurricula).values({
                classId: classId,
                totalPoints,
                isValid,
                status: 'draft',
                version: nextVersion,
            }).returning();
            curriculum = newCurriculum;
        }

        // Delete existing course instances for this curriculum
        await db.delete(courseInstances)
            .where(eq(courseInstances.curriculumId, curriculum.id));

        // Insert new course instances
        if (courses && courses.length > 0) {
            await db.insert(courseInstances).values(
                courses.map((course: any) => ({
                    curriculumId: curriculum.id,
                    classId: classId, // Denormalized for faster queries
                    courseCode: course.courseCode,
                    courseName: course.courseName,
                    points: course.points,
                    category: course.category,
                    year: course.year,
                    terms: course.terms || [],
                    teacherId: null, // No teacher assigned yet
                    roomId: null, // No room assigned yet
                    lessonDuration: null, // Use project default
                }))
            );
        }

        // Return the updated curriculum info
        res.json({
            id: curriculum.id,
            classId: classId,
            courses: courses,
            totalPoints: curriculum.totalPoints,
            isValid: curriculum.isValid,
            status: curriculum.status,
            version: curriculum.version,
        });
    } catch (error) {
        console.error('Update curriculum error:', error);
        res.status(500).json({ error: 'Failed to update curriculum' });
    }
});

export default router;
