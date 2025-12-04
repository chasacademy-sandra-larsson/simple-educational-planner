import { Router, Response } from 'express';
import { db } from '../db';
import { rooms } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { projects } from '../db/schema';

const router = Router();

// Room request types
interface CreateRoomRequest {
    roomNumber: string;
    roomType?: string;
    capacity?: number;
    notes?: string;
}

// All routes require authentication
router.use(authMiddleware);

// Get all rooms for a project
router.get('/projects/:projectId/rooms', async (req: AuthRequest, res: Response) => {
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

        const projectRooms = await db.query.rooms.findMany({
            where: eq(rooms.projectId, req.params.projectId),
            orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)],
        });

        res.json(projectRooms);
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// Get a single room
router.get('/rooms/:id', async (req: AuthRequest, res: Response) => {
    try {
        const room = await db.query.rooms.findFirst({
            where: eq(rooms.id, req.params.id),
            with: {
                project: true,
            },
        });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Verify project ownership
        if (room.project.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(room);
    } catch (error) {
        console.error('Get room error:', error);
        res.status(500).json({ error: 'Failed to fetch room' });
    }
});

// Create a new room
router.post('/projects/:projectId/rooms', async (req: AuthRequest, res: Response) => {
    try {
        const { roomNumber, roomType, capacity, notes } = req.body;

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

        const [newRoom] = await db.insert(rooms).values({
            projectId: req.params.projectId,
            roomNumber,
            roomType,
            capacity,
            notes,
        }).returning();

        res.status(201).json(newRoom);
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Update a room
router.put('/rooms/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { roomNumber, roomType, capacity, notes } = req.body;

        // Get room with project info
        const room = await db.query.rooms.findFirst({
            where: eq(rooms.id, req.params.id),
            with: {
                project: true,
            },
        });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Verify project ownership
        if (room.project.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const [updatedRoom] = await db.update(rooms)
            .set({ roomNumber, roomType, capacity, notes })
            .where(eq(rooms.id, req.params.id))
            .returning();

        res.json(updatedRoom);
    } catch (error) {
        console.error('Update room error:', error);
        res.status(500).json({ error: 'Failed to update room' });
    }
});

// Delete a room
router.delete('/rooms/:id', async (req: AuthRequest, res: Response) => {
    try {
        // Get room with project info
        const room = await db.query.rooms.findFirst({
            where: eq(rooms.id, req.params.id),
            with: {
                project: true,
            },
        });

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Verify project ownership
        if (room.project.userId !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await db.delete(rooms).where(eq(rooms.id, req.params.id));

        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

export default router;
