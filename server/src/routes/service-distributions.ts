import { Router, Response } from 'express';
import { db } from '../db';
import { teacherServiceDistributions, serviceDistributionCourses, teachers, projects, courseInstances } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create service distributions for all teachers in a project for a specific academic year
router.post('/projects/:projectId/service-distributions', async (req: AuthRequest, res: Response) => {
    try {
        const { academicYear, servicePoints = 600 } = req.body;
        const projectId = req.params.projectId;

        if (!academicYear) {
            return res.status(400).json({ error: 'academicYear is required' });
        }

        // Verify project ownership
        const project = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (project.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Get all teachers for this project
        const projectTeachers = await db.select()
            .from(teachers)
            .where(eq(teachers.projectId, projectId));

        if (projectTeachers.length === 0) {
            return res.status(400).json({ error: 'No teachers found for this project' });
        }

        // Create service distributions for all teachers
        const distributions = [];
        for (const teacher of projectTeachers) {
            // Check if distribution already exists
            const existing = await db.select()
                .from(teacherServiceDistributions)
                .where(and(
                    eq(teacherServiceDistributions.teacherId, teacher.id),
                    eq(teacherServiceDistributions.projectId, projectId),
                    eq(teacherServiceDistributions.academicYear, academicYear)
                ))
                .limit(1);

            if (existing.length > 0) {
                // Update existing distribution
                const [updated] = await db.update(teacherServiceDistributions)
                    .set({
                        servicePoints,
                        updatedAt: new Date(),
                    })
                    .where(eq(teacherServiceDistributions.id, existing[0].id))
                    .returning();
                distributions.push(updated);
            } else {
                // Create new distribution
                const [newDistribution] = await db.insert(teacherServiceDistributions).values({
                    teacherId: teacher.id,
                    projectId: projectId,
                    academicYear,
                    servicePoints,
                    assignedPoints: 0,
                }).returning();
                distributions.push(newDistribution);
            }
        }

        res.status(201).json({ distributions, message: `Created ${distributions.length} service distributions` });
    } catch (error: any) {
        console.error('Create service distributions error:', error);
        const errorMessage = error?.message || 'Failed to create service distributions';
        res.status(500).json({ 
            error: errorMessage,
            details: error?.stack || error
        });
    }
});

// Update service distribution with assigned courses
router.put('/projects/:projectId/service-distributions/:distributionId', async (req: AuthRequest, res: Response) => {
    try {
        const { courseInstanceIds } = req.body;
        const distributionId = req.params.distributionId;
        const projectId = req.params.projectId;

        // Verify distribution exists and belongs to project
        const distribution = await db.select()
            .from(teacherServiceDistributions)
            .where(and(
                eq(teacherServiceDistributions.id, distributionId),
                eq(teacherServiceDistributions.projectId, projectId)
            ))
            .limit(1);

        if (distribution.length === 0) {
            return res.status(404).json({ error: 'Service distribution not found' });
        }

        // Verify project ownership
        const project = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (project.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Delete existing course assignments
        await db.delete(serviceDistributionCourses)
            .where(eq(serviceDistributionCourses.serviceDistributionId, distributionId));

        // Insert new course assignments
        if (courseInstanceIds && courseInstanceIds.length > 0) {
            // Verify all course instances belong to the project
            const courseInstancesData = await db.select()
                .from(courseInstances)
                .where(inArray(courseInstances.id, courseInstanceIds));

            // Calculate assigned points
            const assignedPoints = courseInstancesData.reduce((sum, ci) => sum + ci.points, 0);

            // Insert course assignments
            await db.insert(serviceDistributionCourses).values(
                courseInstanceIds.map((courseInstanceId: string) => ({
                    serviceDistributionId: distributionId,
                    courseInstanceId,
                }))
            );

            // Update assigned points
            await db.update(teacherServiceDistributions)
                .set({
                    assignedPoints,
                    updatedAt: new Date(),
                })
                .where(eq(teacherServiceDistributions.id, distributionId));
        } else {
            // No courses assigned, set assigned points to 0
            await db.update(teacherServiceDistributions)
                .set({
                    assignedPoints: 0,
                    updatedAt: new Date(),
                })
                .where(eq(teacherServiceDistributions.id, distributionId));
        }

        // Return updated distribution
        const [updatedDistribution] = await db.select()
            .from(teacherServiceDistributions)
            .where(eq(teacherServiceDistributions.id, distributionId))
            .limit(1);

        res.json(updatedDistribution);
    } catch (error) {
        console.error('Update service distribution error:', error);
        res.status(500).json({ error: 'Failed to update service distribution' });
    }
});

// Get all service distributions for a project and academic year
router.get('/projects/:projectId/service-distributions', async (req: AuthRequest, res: Response) => {
    try {
        const projectId = req.params.projectId;
        const academicYear = req.query.academicYear as string;

        // Verify project ownership
        const project = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (project.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Build query
        const whereConditions = [eq(teacherServiceDistributions.projectId, projectId)];
        if (academicYear) {
            whereConditions.push(eq(teacherServiceDistributions.academicYear, academicYear));
        }

        const distributions = await db.select()
            .from(teacherServiceDistributions)
            .where(and(...whereConditions));

        res.json(distributions);
    } catch (error) {
        console.error('Get service distributions error:', error);
        res.status(500).json({ error: 'Failed to fetch service distributions' });
    }
});

// Update teacher assignment for a course instance
router.put('/projects/:projectId/course-instances/:courseInstanceId/teacher', async (req: AuthRequest, res: Response) => {
    try {
        const { teacherId } = req.body; // Can be null to unassign
        const courseInstanceId = req.params.courseInstanceId;
        const projectId = req.params.projectId;

        // Verify project ownership
        const project = await db.select()
            .from(projects)
            .where(and(
                eq(projects.id, projectId),
                eq(projects.userId, req.userId!)
            ))
            .limit(1);

        if (project.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Verify course instance exists
        const [courseInstance] = await db.select()
            .from(courseInstances)
            .where(eq(courseInstances.id, courseInstanceId))
            .limit(1);

        if (!courseInstance) {
            return res.status(404).json({ error: 'Course instance not found' });
        }

        // If teacherId is provided, verify teacher belongs to the project
        if (teacherId) {
            const [teacher] = await db.select()
                .from(teachers)
                .where(and(
                    eq(teachers.id, teacherId),
                    eq(teachers.projectId, projectId)
                ))
                .limit(1);

            if (!teacher) {
                return res.status(400).json({ error: 'Teacher not found in this project' });
            }
        }

        // Update the course instance
        const [updated] = await db.update(courseInstances)
            .set({
                teacherId: teacherId || null,
                updatedAt: new Date(),
            })
            .where(eq(courseInstances.id, courseInstanceId))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error('Update course instance teacher error:', error);
        res.status(500).json({ error: 'Failed to update course instance teacher' });
    }
});

export default router;

