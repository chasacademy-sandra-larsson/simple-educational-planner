/**
 * Proxy routes for Skolverket Syllabus API
 *
 * This proxies requests to avoid CORS issues when calling from the frontend.
 */

import { Router, Request, Response } from 'express';

const router = Router();
const BASE_URL = "https://api.skolverket.se/syllabus/v1";

// No authentication required - Skolverket data is public

/**
 * GET /api/skolverket/programs
 * Get all programs from Skolverket
 */
router.get('/programs', async (req: Request, res: Response) => {
    try {
        const response = await fetch(`${BASE_URL}/programs`, {
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Skolverket API error: ${response.statusText}`
            });
        }

        const data = await response.json() as any;

        // Extract just the programs array
        const programs = data.programs || data;

        if (!Array.isArray(programs)) {
            return res.status(500).json({ error: 'Unexpected response format from Skolverket' });
        }

        // Return simplified program list
        const simplifiedPrograms = programs.map((p: any) => ({
            code: p.code,
            name: p.name,
            category: p.category,
            schoolTypes: p.schoolTypes,
        }));

        res.json(simplifiedPrograms);
    } catch (error) {
        console.error('Error fetching programs from Skolverket:', error);
        res.status(500).json({ error: 'Failed to fetch programs from Skolverket' });
    }
});

/**
 * GET /api/skolverket/programs/:code
 * Get detailed program info including orientations
 */
router.get('/programs/:code', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;

        const response = await fetch(`${BASE_URL}/programs/${code}`, {
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Skolverket API error: ${response.statusText}`
            });
        }

        const data = await response.json() as any;
        const program = data.program;

        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }

        // Extract orientations
        const orientations = (program.orientations || []).map((o: any) => ({
            code: o.code,
            name: o.name,
            programCode: code,
        }));

        // Extract foundational subjects with courses
        const foundationSubjects = extractSubjectsWithCourses(
            program.foundationSubjects?.subjects || [],
            'FOUNDATIONAL_SUBJECTS'
        );

        // Extract programme-specific subjects with courses
        const programmeSpecificSubjects = extractSubjectsWithCourses(
            program.programmeSpecificSubjects?.subjects || [],
            'PROGRAMME_SPECIFIC_SUBJECTS'
        );

        // Extract orientation subjects with courses for each orientation
        const orientationsWithCourses = (program.orientations || []).map((o: any) => ({
            code: o.code,
            name: o.name,
            subjects: extractSubjectsWithCourses(o.subjects || [], 'ORIENTATION'),
        }));

        // Extract specialization (programfördjupning) subjects
        const specializationSubjects = extractSubjectsWithCourses(
            program.specialization?.subjects || [],
            'PROGRAMME_SPECIALIZATION'
        );

        // Get diploma project info
        const diplomaProject = program.diplomaProject ? {
            code: program.diplomaProject.code,
            name: program.diplomaProject.name || 'Gymnasiearbete',
            points: program.diplomaProject.points || 100,
        } : null;

        // Get individual option info
        const individualOption = program.individualOption ? {
            points: program.individualOption.points || 200,
        } : { points: 200 };

        res.json({
            code: program.code,
            name: program.name,
            category: program.category,
            orientations,
            foundationSubjects,
            programmeSpecificSubjects,
            orientationsWithCourses,
            specializationSubjects,
            diplomaProject,
            individualOption,
        });
    } catch (error) {
        console.error('Error fetching program from Skolverket:', error);
        res.status(500).json({ error: 'Failed to fetch program from Skolverket' });
    }
});

/**
 * GET /api/skolverket/programs/:code/orientations
 * Get orientations for a specific program
 */
router.get('/programs/:code/orientations', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;

        const response = await fetch(`${BASE_URL}/programs/${code}`, {
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Skolverket API error: ${response.statusText}`
            });
        }

        const data = await response.json() as any;
        const program = data.program;

        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }

        // Extract orientations
        const orientations = (program.orientations || []).map((o: any) => ({
            code: o.code,
            name: o.name,
            programCode: code,
        }));

        res.json(orientations);
    } catch (error) {
        console.error('Error fetching orientations from Skolverket:', error);
        res.status(500).json({ error: 'Failed to fetch orientations from Skolverket' });
    }
});

/**
 * GET /api/skolverket/programs/:code/courses
 * Get all courses for a program (optionally filtered by orientation)
 */
router.get('/programs/:code/courses', async (req: Request, res: Response) => {
    try {
        const { code } = req.params;
        const orientationCode = req.query.orientation as string | undefined;

        const response = await fetch(`${BASE_URL}/programs/${code}`, {
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: `Skolverket API error: ${response.statusText}`
            });
        }

        const data = await response.json() as any;
        const program = data.program;

        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }

        const courses: any[] = [];

        // Add foundational subjects
        addCoursesFromSubjects(
            program.foundationSubjects?.subjects || [],
            'FOUNDATIONAL_SUBJECTS',
            courses
        );

        // Add programme-specific subjects
        addCoursesFromSubjects(
            program.programmeSpecificSubjects?.subjects || [],
            'PROGRAMME_SPECIFIC_SUBJECTS',
            courses
        );

        // Add orientation subjects if orientation is specified
        if (orientationCode && program.orientations) {
            const orientation = program.orientations.find((o: any) => o.code === orientationCode);
            if (orientation) {
                addCoursesFromSubjects(
                    orientation.subjects || [],
                    'ORIENTATION',
                    courses
                );
            }
        }

        // Add specialization subjects
        addCoursesFromSubjects(
            program.specialization?.subjects || [],
            'PROGRAMME_SPECIALIZATION',
            courses
        );

        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses from Skolverket:', error);
        res.status(500).json({ error: 'Failed to fetch courses from Skolverket' });
    }
});

/**
 * Helper function to extract subjects with their courses
 */
function extractSubjectsWithCourses(subjects: any[], category: string): any[] {
    const result: any[] = [];

    for (const subject of subjects) {
        if (subject.courses && Array.isArray(subject.courses)) {
            const subjectData = {
                code: subject.code,
                name: subject.name,
                courses: subject.courses.map((course: any) => ({
                    code: course.code,
                    name: course.name?.startsWith('Nivå ')
                        ? `${subject.name} ${course.name.replace('Nivå ', '')}`
                        : course.name,
                    points: parseInt(course.points) || 0,
                    category,
                })),
            };
            result.push(subjectData);
        }
    }

    return result;
}

/**
 * Helper function to add courses from subjects array
 */
function addCoursesFromSubjects(subjects: any[], category: string, courses: any[]): void {
    for (const subject of subjects) {
        if (subject.courses && Array.isArray(subject.courses)) {
            for (const course of subject.courses) {
                const courseName = course.name?.startsWith('Nivå ')
                    ? `${subject.name} ${course.name.replace('Nivå ', '')}`
                    : course.name;

                courses.push({
                    code: course.code,
                    name: courseName,
                    points: parseInt(course.points) || 0,
                    category,
                    subjectCode: subject.code,
                    subjectName: subject.name,
                });
            }
        }
    }
}

export default router;
