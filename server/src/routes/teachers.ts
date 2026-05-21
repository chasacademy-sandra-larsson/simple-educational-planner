import { Router, Response } from 'express';
import { db } from '../db';
import { teachers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { projects } from '../db/schema';

const router = Router();

// Teacher request types
interface CreateTeacherRequest {
    name: string;
    email?: string;
    subject?: string;
    notes?: string;
}

// All routes require authentication
router.use(authMiddleware);

// Get all teachers for a project
router.get('/projects/:projectId/teachers', async (req: AuthRequest, res: Response) => {
    try {
        // Verify project ownership
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, req.params.projectId),
                eq(projects.userId, req.userId!)
            ),
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const projectTeachers = await db.query.teachers.findMany({
            where: eq(teachers.projectId, req.params.projectId),
            orderBy: (teachers, { asc }) => [asc(teachers.name)],
        });

        res.json(projectTeachers);
    } catch (error) {
        console.error('Get teachers error:', error);
        res.status(500).json({ error: 'Failed to fetch teachers' });
    }
});

// Get a single teacher
router.get('/teachers/:id', async (req: AuthRequest, res: Response) => {
    try {
        const teacher = await db.query.teachers.findFirst({
            where: eq(teachers.id, req.params.id),
            with: {
                project: true,
            },
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // Verify project ownership
        if (teacher.project.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(teacher);
    } catch (error) {
        console.error('Get teacher error:', error);
        res.status(500).json({ error: 'Failed to fetch teacher' });
    }
});

// Create a new teacher
router.post('/projects/:projectId/teachers', async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, subject, notes } = req.body;

        // Verify project ownership
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.id, req.params.projectId),
                eq(projects.userId, req.userId!)
            ),
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const [newTeacher] = await db.insert(teachers).values({
            projectId: req.params.projectId,
            name,
            email,
            subject,
            notes,
        }).returning();

        res.status(201).json(newTeacher);
    } catch (error) {
        console.error('Create teacher error:', error);
        res.status(500).json({ error: 'Failed to create teacher' });
    }
});

// Update a teacher
router.put('/teachers/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { name, email, subject, notes } = req.body;

        // Get teacher with project info
        const teacher = await db.query.teachers.findFirst({
            where: eq(teachers.id, req.params.id),
            with: {
                project: true,
            },
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // Verify project ownership
        if (teacher.project.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [updatedTeacher] = await db.update(teachers)
            .set({ name, email, subject, notes })
            .where(eq(teachers.id, req.params.id))
            .returning();

        res.json(updatedTeacher);
    } catch (error) {
        console.error('Update teacher error:', error);
        res.status(500).json({ error: 'Failed to update teacher' });
    }
});

// Delete a teacher
router.delete('/teachers/:id', async (req: AuthRequest, res: Response) => {
    try {
        // Get teacher with project info
        const teacher = await db.query.teachers.findFirst({
            where: eq(teachers.id, req.params.id),
            with: {
                project: true,
            },
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // Verify project ownership
        if (teacher.project.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await db.delete(teachers).where(eq(teachers.id, req.params.id));

        res.json({ message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Delete teacher error:', error);
        res.status(500).json({ error: 'Failed to delete teacher' });
    }
});

export default router;
