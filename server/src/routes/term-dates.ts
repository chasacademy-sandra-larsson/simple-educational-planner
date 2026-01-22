import { Router, Response } from 'express';
import { db } from '../db';
import { termDates, projects } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all term dates for a project
router.get('/projects/:projectId/term-dates', async (req: AuthRequest, res: Response) => {
    try {
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

        const dates = await db.select()
            .from(termDates)
            .where(eq(termDates.projectId, req.params.projectId))
            .orderBy(desc(termDates.academicYear), termDates.year);

        res.json(dates);
    } catch (error) {
        console.error('Get term dates error:', error);
        res.status(500).json({ error: 'Failed to fetch term dates' });
    }
});

// Get term dates for a specific academic year
router.get('/projects/:projectId/term-dates/:academicYear', async (req: AuthRequest, res: Response) => {
    try {
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

        const dates = await db.select()
            .from(termDates)
            .where(and(
                eq(termDates.projectId, req.params.projectId),
                eq(termDates.academicYear, req.params.academicYear)
            ))
            .orderBy(termDates.year);

        res.json(dates);
    } catch (error) {
        console.error('Get term dates by year error:', error);
        res.status(500).json({ error: 'Failed to fetch term dates' });
    }
});

// Create term dates for a project
router.post('/projects/:projectId/term-dates', async (req: AuthRequest, res: Response) => {
    try {
        const { academicYear, year, fallTermStart, fallTermEnd, springTermStart, springTermEnd } = req.body;

        // Validate required fields
        if (!academicYear || !year || !fallTermStart || !fallTermEnd || !springTermStart || !springTermEnd) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate year is 1, 2, or 3
        if (![1, 2, 3].includes(year)) {
            return res.status(400).json({ error: 'Year must be 1, 2, or 3' });
        }

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

        const [newTermDates] = await db.insert(termDates).values({
            projectId: req.params.projectId,
            academicYear,
            year,
            fallTermStart,
            fallTermEnd,
            springTermStart,
            springTermEnd,
        }).returning();

        res.status(201).json(newTermDates);
    } catch (error: any) {
        console.error('Create term dates error:', error);
        // Handle unique constraint violation
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Term dates already exist for this academic year and gymnasium year' });
        }
        res.status(500).json({ error: 'Failed to create term dates' });
    }
});

// Update term dates
router.put('/term-dates/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { academicYear, year, fallTermStart, fallTermEnd, springTermStart, springTermEnd } = req.body;

        // Get term dates to verify ownership
        const [existingTermDates] = await db.select()
            .from(termDates)
            .where(eq(termDates.id, req.params.id))
            .limit(1);

        if (!existingTermDates) {
            return res.status(404).json({ error: 'Term dates not found' });
        }

        // Verify project ownership
        const [project] = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, existingTermDates.projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (!project) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [updatedTermDates] = await db.update(termDates)
            .set({
                academicYear: academicYear || existingTermDates.academicYear,
                year: year || existingTermDates.year,
                fallTermStart: fallTermStart || existingTermDates.fallTermStart,
                fallTermEnd: fallTermEnd || existingTermDates.fallTermEnd,
                springTermStart: springTermStart || existingTermDates.springTermStart,
                springTermEnd: springTermEnd || existingTermDates.springTermEnd,
                updatedAt: new Date(),
            })
            .where(eq(termDates.id, req.params.id))
            .returning();

        res.json(updatedTermDates);
    } catch (error: any) {
        console.error('Update term dates error:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Term dates already exist for this academic year and gymnasium year' });
        }
        res.status(500).json({ error: 'Failed to update term dates' });
    }
});

// Delete term dates
router.delete('/term-dates/:id', async (req: AuthRequest, res: Response) => {
    try {
        // Get term dates to verify ownership
        const [existingTermDates] = await db.select()
            .from(termDates)
            .where(eq(termDates.id, req.params.id))
            .limit(1);

        if (!existingTermDates) {
            return res.status(404).json({ error: 'Term dates not found' });
        }

        // Verify project ownership
        const [project] = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, existingTermDates.projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (!project) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await db.delete(termDates).where(eq(termDates.id, req.params.id));

        res.json({ message: 'Term dates deleted successfully' });
    } catch (error) {
        console.error('Delete term dates error:', error);
        res.status(500).json({ error: 'Failed to delete term dates' });
    }
});

export default router;
