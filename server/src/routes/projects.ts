import { Router, Response } from 'express';
import { db } from '../db';
import { projects, projectPrograms, projectClasses, classCurricula } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { CreateProjectRequest, CreateProgramRequest, CreateClassRequest, UpdateCurriculumRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all projects for the logged-in user
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const userProjects = await db.query.projects.findMany({
            where: eq(projects.userId, req.userId!),
            orderBy: (projects, { desc }) => [desc(projects.createdAt)],
        });

        res.json(userProjects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Get a single project with all related data
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, req.params.id),
                eq(projects.userId, req.userId!)
            ),
            with: {
                programs: true,
                classes: {
                    with: {
                        program: true,
                        curricula: true,
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// Create a new project
router.post('/', async (req: AuthRequest<{}, {}, CreateProjectRequest>, res: Response) => {
    try {
        const { name, description } = req.body;

        const [newProject] = await db.insert(projects).values({
            userId: req.userId!,
            name,
            description,
        }).returning();

        res.status(201).json(newProject);
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Update a project
router.put('/:id', async (req: AuthRequest<{}, {}, CreateProjectRequest>, res: Response) => {
    try {
        const { name, description } = req.body;

        const [updatedProject] = await db.update(projects)
            .set({
                name,
                description,
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

// Add a program to a project
router.post('/:id/programs', async (req: AuthRequest<{}, {}, CreateProgramRequest>, res: Response) => {
    try {
        const { programCode, programName, orientationCode, orientationName } = req.body;

        // Verify project ownership
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, req.params.id),
                eq(projects.userId, req.userId!)
            ),
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const [newProgram] = await db.insert(projectPrograms).values({
            projectId: req.params.id,
            programCode,
            programName,
            orientationCode,
            orientationName,
        }).returning();

        res.status(201).json(newProgram);
    } catch (error) {
        console.error('Add program error:', error);
        res.status(500).json({ error: 'Failed to add program' });
    }
});

// Add a class to a project
router.post('/:id/classes', async (req: AuthRequest<{}, {}, CreateClassRequest>, res: Response) => {
    try {
        const { classCode, programCode, programName, orientationCode, orientationName, startYear } = req.body;

        // Verify project ownership
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, req.params.id),
                eq(projects.userId, req.userId!)
            ),
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if program with this code and orientation already exists
        let program = await db.query.projectPrograms.findFirst({
            where: and(
                eq(projectPrograms.projectId, req.params.id),
                eq(projectPrograms.programCode, programCode),
                eq(projectPrograms.orientationCode, orientationCode)
            ),
        });

        // If not, create it
        if (!program) {
            const [newProgram] = await db.insert(projectPrograms).values({
                projectId: req.params.id,
                programCode,
                programName,
                orientationCode,
                orientationName,
            }).returning();
            program = newProgram;
        }

        const graduationYear = startYear + 3;

        const [newClass] = await db.insert(projectClasses).values({
            projectId: req.params.id,
            programId: program.id,
            classCode,
            startYear,
            graduationYear,
        }).returning();

        res.status(201).json(newClass);
    } catch (error) {
        console.error('Add class error:', error);
        res.status(500).json({ error: 'Failed to add class' });
    }
});

// Update curriculum for a class
router.put('/classes/:classId/curriculum', async (req: AuthRequest<{}, {}, UpdateCurriculumRequest>, res: Response) => {
    try {
        const { courses } = req.body;

        // Calculate total points
        const totalPoints = courses.reduce((sum, course) => sum + course.points, 0);
        const isValid = totalPoints === 2500 ? 1 : 0;

        // Check if curriculum exists
        const existingCurriculum = await db.query.classCurricula.findFirst({
            where: eq(classCurricula.classId, req.params.classId),
        });

        let curriculum;

        if (existingCurriculum) {
            // Update existing curriculum
            [curriculum] = await db.update(classCurricula)
                .set({
                    courses: courses as any,
                    totalPoints,
                    isValid,
                    updatedAt: new Date(),
                })
                .where(eq(classCurricula.classId, req.params.classId))
                .returning();
        } else {
            // Create new curriculum
            [curriculum] = await db.insert(classCurricula).values({
                classId: req.params.classId,
                courses: courses as any,
                totalPoints,
                isValid,
            }).returning();
        }

        res.json(curriculum);
    } catch (error) {
        console.error('Update curriculum error:', error);
        res.status(500).json({ error: 'Failed to update curriculum' });
    }
});

export default router;
