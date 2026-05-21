import { Router, Response } from 'express';
import { db } from '../db';
import { projects, projectClasses, courseInstances, classCurricula, teachers, classMentors } from '../db/schema';
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

        // Get all teachers for this project (for enriching course data)
        const projectTeachers = await db.select()
            .from(teachers)
            .where(eq(teachers.projectId, project.id));
        const teacherMap = new Map(projectTeachers.map(t => [t.id, t]));

        // Get mentors for all classes
        const mentorAssignments = classIds.length > 0
            ? await db.select()
                .from(classMentors)
                .where(inArray(classMentors.classId, classIds))
            : [];

        // Group mentors by class
        const mentorsByClass = new Map<string, { teacherId: string; teacherName: string; isPrimary: boolean }[]>();
        for (const mentor of mentorAssignments) {
            const teacher = teacherMap.get(mentor.teacherId);
            if (teacher) {
                const classMentorList = mentorsByClass.get(mentor.classId) || [];
                classMentorList.push({
                    teacherId: mentor.teacherId,
                    teacherName: teacher.name,
                    isPrimary: mentor.isPrimary === 1,
                });
                mentorsByClass.set(mentor.classId, classMentorList);
            }
        }

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
                return { ...cls, curriculum: null, mentors: mentorsByClass.get(cls.id) || [] };
            }

            const classCourses = instances
                .filter(ci => ci.curriculumId === activeCurriculum.id)
                .map(ci => {
                    const teacher = ci.teacherId ? teacherMap.get(ci.teacherId) : null;
                    return {
                        id: ci.id, // Include course instance ID
                        courseCode: ci.courseCode,
                        courseName: ci.courseName,
                        points: ci.points,
                        category: ci.category,
                        year: ci.year,
                        terms: ci.terms,
                        teacherId: ci.teacherId,
                        teacherName: teacher?.name || null,
                        roomId: ci.roomId,
                    };
                });
            
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
                mentors: mentorsByClass.get(cls.id) || [],
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

        // Find existing curriculum (approved or draft) or create new one
        const existingCurricula = await db.select()
            .from(classCurricula)
            .where(eq(classCurricula.classId, classId))
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

        // Get existing course instances to preserve teacher/room assignments
        const existingInstances = await db.select()
            .from(courseInstances)
            .where(eq(courseInstances.classId, classId));

        // Build a map of courseCode -> preserved data (teacherId, roomId, lessonDuration, year, terms)
        const assignmentMap = new Map<string, {
            teacherId: string | null,
            roomId: string | null,
            lessonDuration: number | null,
            year: number,
            terms: string[],
        }>();
        for (const inst of existingInstances) {
            assignmentMap.set(inst.courseCode, {
                teacherId: inst.teacherId,
                roomId: inst.roomId,
                lessonDuration: inst.lessonDuration,
                year: inst.year,
                terms: inst.terms as string[],
            });
        }

        // Delete existing course instances for this class
        await db.delete(courseInstances)
            .where(eq(courseInstances.classId, classId));

        // Insert new course instances, preserving teacher/room/year/terms from existing data
        if (courses && courses.length > 0) {
            await db.insert(courseInstances).values(
                courses.map((course: any) => {
                    const existing = assignmentMap.get(course.courseCode);
                    return {
                        curriculumId: curriculum.id,
                        classId: classId,
                        courseCode: course.courseCode,
                        courseName: course.courseName,
                        points: course.points,
                        category: course.category,
                        // Preserve year and terms if they exist, otherwise use course values
                        year: existing?.year ?? course.year ?? 1,
                        terms: existing?.terms ?? course.terms ?? ['HT', 'VT'],
                        teacherId: existing?.teacherId || null,
                        roomId: existing?.roomId || null,
                        lessonDuration: existing?.lessonDuration || null,
                    };
                })
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

// Helper function to fetch courses from Skolverket API
async function fetchCoursesFromSkolverket(programCode: string, orientationCode: string): Promise<{
    courseCode: string;
    courseName: string;
    points: number;
    category: string;
    year: number;
    terms: string[];
}[]> {
    const BASE_URL = "https://api.skolverket.se/syllabus/v1";
    
    try {
        const response = await fetch(`${BASE_URL}/programs/${programCode}`, {
            headers: { Accept: "application/json" },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch program structure: ${response.statusText}`);
        }

        const data: any = await response.json();
        const courses: {
            courseCode: string;
            courseName: string;
            points: number;
            category: string;
            year: number;
            terms: string[];
        }[] = [];

        // Helper to add courses from a subject list
        const addCoursesFromSubjects = (subjects: any[], category: string) => {
            if (!subjects || !Array.isArray(subjects)) return;
            
            for (const subject of subjects) {
                if (subject.courses && Array.isArray(subject.courses)) {
                    for (const course of subject.courses) {
                        const courseName = course.name?.startsWith('Nivå ')
                            ? `${subject.name} ${course.name.replace('Nivå ', '')}`
                            : course.name;

                        courses.push({
                            courseCode: course.code,
                            courseName: courseName,
                            points: parseInt(course.points) || 0,
                            category: category,
                            year: 1, // Default to year 1, will be distributed later
                            terms: ['HT', 'VT'], // Default to full year (HT=hösttermin, VT=vårtermin)
                        });
                    }
                }
            }
        };

        // 1. Add foundational subjects
        addCoursesFromSubjects(
            data.program?.foundationSubjects?.subjects,
            'FOUNDATIONAL_SUBJECTS'
        );

        // 2. Add programme-specific subjects
        addCoursesFromSubjects(
            data.program?.programmeSpecificSubjects?.subjects,
            'PROGRAMME_SPECIFIC_SUBJECTS'
        );

        // 3. Add orientation-specific subjects
        if (data.program?.orientations && Array.isArray(data.program.orientations)) {
            const orientation = data.program.orientations.find((o: any) => o.code === orientationCode);
            if (orientation) {
                addCoursesFromSubjects(orientation.subjects, 'ORIENTATION');
            }
        }

        // Add Individual Choice courses (required: 200p)
        courses.push({
            courseCode: 'INDIVIDUAL_CHOICE_1',
            courseName: 'Individuellt val 1',
            points: 100,
            category: 'INDIVIDUAL_CHOICE',
            year: 3,
            terms: ['HT'], // Fall term only
        });
        courses.push({
            courseCode: 'INDIVIDUAL_CHOICE_2',
            courseName: 'Individuellt val 2',
            points: 100,
            category: 'INDIVIDUAL_CHOICE',
            year: 3,
            terms: ['VT'], // Spring term only
        });

        // Add Gymnasiearbete (required: 100p)
        courses.push({
            courseCode: 'GYMNASIEARBETE',
            courseName: 'Gymnasiearbete',
            points: 100,
            category: 'GYMNASIEARBETE',
            year: 3,
            terms: ['HT', 'VT'], // Full year
        });

        // Distribute courses across years based on total points
        // Target: ~833p per year for 2500p total
        let year1Points = 0, year2Points = 0, year3Points = 0;
        const targetPerYear = 833;

        // First pass: assign foundation and programme-specific to year 1-2
        // Terms are always ['HT', 'VT'] - the data-loader converts based on course.year
        for (const course of courses) {
            if (course.category === 'FOUNDATIONAL_SUBJECTS' || course.category === 'PROGRAMME_SPECIFIC_SUBJECTS') {
                if (year1Points + course.points <= targetPerYear + 100) {
                    course.year = 1;
                    course.terms = ['HT', 'VT'];
                    year1Points += course.points;
                } else if (year2Points + course.points <= targetPerYear + 100) {
                    course.year = 2;
                    course.terms = ['HT', 'VT'];
                    year2Points += course.points;
                } else {
                    course.year = 3;
                    course.terms = ['HT', 'VT'];
                    year3Points += course.points;
                }
            }
        }

        // Second pass: assign orientation courses to year 2-3
        for (const course of courses) {
            if (course.category === 'ORIENTATION') {
                if (year2Points + course.points <= targetPerYear + 100) {
                    course.year = 2;
                    course.terms = ['HT', 'VT'];
                    year2Points += course.points;
                } else {
                    course.year = 3;
                    course.terms = ['HT', 'VT'];
                    year3Points += course.points;
                }
            }
        }

        // Calculate current total and add Programfördjupning courses to reach 2500p
        const currentTotal = courses.reduce((sum, c) => sum + c.points, 0);
        const REQUIRED_TOTAL = 2500;
        
        if (currentTotal < REQUIRED_TOTAL) {
            const missingPoints = REQUIRED_TOTAL - currentTotal;
            const numExtraCourses = Math.ceil(missingPoints / 100);
            
            for (let i = 0; i < numExtraCourses; i++) {
                const pointsNeeded = Math.min(100, REQUIRED_TOTAL - courses.reduce((sum, c) => sum + c.points, 0));
                if (pointsNeeded <= 0) break;
                
                courses.push({
                    courseCode: `PROGRAMFORDJUPNING_${i + 1}`,
                    courseName: `Programfördjupning ${i + 1}`,
                    points: pointsNeeded,
                    category: 'ORIENTATION',
                    year: i < 2 ? 2 : 3,
                    terms: i < 2 ? ['term3', 'term4'] : ['term5', 'term6'],
                });
            }
        }

        return courses;
    } catch (error) {
        console.error('Error fetching courses from Skolverket:', error);
        return [];
    }
}

// Batch initialize curricula for all classes without curriculum
router.post('/:id/initialize-curricula', async (req: AuthRequest, res: Response) => {
    try {
        const projectId = req.params.id;
        
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

        // Get all classes for this project
        const classes = await db.select()
            .from(projectClasses)
            .where(eq(projectClasses.projectId, projectId));

        if (classes.length === 0) {
            return res.json({ message: 'No classes found in project', initialized: 0 });
        }

        // Get existing curricula
        const classIds = classes.map(c => c.id);
        const existingCurricula = await db.select()
            .from(classCurricula)
            .where(inArray(classCurricula.classId, classIds));

        // Find classes without curriculum (or with empty curriculum)
        const curriculaByClass = new Map(existingCurricula.map(c => [c.classId, c]));
        
        // Also check which curricula have course instances
        const curriculumIds = existingCurricula.map(c => c.id);
        const existingInstances = curriculumIds.length > 0
            ? await db.select()
                .from(courseInstances)
                .where(inArray(courseInstances.curriculumId, curriculumIds))
            : [];
        
        const instancesByCurriculum = new Map<string, number>();
        for (const instance of existingInstances) {
            const count = instancesByCurriculum.get(instance.curriculumId) || 0;
            instancesByCurriculum.set(instance.curriculumId, count + 1);
        }

        // Find classes that need initialization (no curriculum, incomplete courses, or not 2500 points)
        const MIN_COURSES_FOR_COMPLETE = 20;
        const REQUIRED_TOTAL_POINTS = 2500;
        const classesNeedingInit = classes.filter(cls => {
            const curriculum = curriculaByClass.get(cls.id);
            if (!curriculum) return true;
            const instanceCount = instancesByCurriculum.get(curriculum.id) || 0;
            // Re-initialize if fewer than 20 courses OR if total points is not 2500
            return instanceCount < MIN_COURSES_FOR_COMPLETE || curriculum.totalPoints !== REQUIRED_TOTAL_POINTS;
        });

        if (classesNeedingInit.length === 0) {
            return res.json({ message: 'All classes already have curricula', initialized: 0 });
        }

        const results: { classCode: string; success: boolean; error?: string; courseCount?: number }[] = [];

        for (const cls of classesNeedingInit) {
            try {
                // Fetch courses from Skolverket API
                const courses = await fetchCoursesFromSkolverket(cls.programCode, cls.orientationCode);

                if (courses.length === 0) {
                    results.push({ classCode: cls.classCode, success: false, error: 'No courses found from Skolverket' });
                    continue;
                }

                // Calculate total points
                const totalPoints = courses.reduce((sum, c) => sum + c.points, 0);
                const isValid = totalPoints === 2500 ? 1 : 0;

                // Create or update curriculum
                let curriculum = curriculaByClass.get(cls.id);
                
                if (!curriculum) {
                    // Create new curriculum
                    const [newCurriculum] = await db.insert(classCurricula).values({
                        classId: cls.id,
                        totalPoints,
                        isValid,
                        status: 'draft',
                        version: 1,
                    }).returning();
                    curriculum = newCurriculum;
                } else {
                    // Update existing curriculum
                    const [updatedCurriculum] = await db.update(classCurricula)
                        .set({
                            totalPoints,
                            isValid,
                            updatedAt: new Date(),
                        })
                        .where(eq(classCurricula.id, curriculum.id))
                        .returning();
                    curriculum = updatedCurriculum;
                }

                // Get existing course instances to preserve teacher/room assignments
                const existingInstances = await db.select()
                    .from(courseInstances)
                    .where(eq(courseInstances.classId, cls.id));

                // Build a map of courseCode -> assignments
                const assignmentMap = new Map<string, { teacherId: string | null, roomId: string | null, lessonDuration: number | null }>();
                for (const inst of existingInstances) {
                    assignmentMap.set(inst.courseCode, {
                        teacherId: inst.teacherId,
                        roomId: inst.roomId,
                        lessonDuration: inst.lessonDuration,
                    });
                }

                // Delete any existing course instances
                await db.delete(courseInstances)
                    .where(eq(courseInstances.classId, cls.id));

                // Insert course instances, preserving teacher/room assignments
                await db.insert(courseInstances).values(
                    courses.map(course => {
                        const existing = assignmentMap.get(course.courseCode);
                        return {
                            curriculumId: curriculum!.id,
                            classId: cls.id,
                            courseCode: course.courseCode,
                            courseName: course.courseName,
                            points: course.points,
                            category: course.category,
                            year: course.year,
                            terms: course.terms,
                            teacherId: existing?.teacherId || null,
                            roomId: existing?.roomId || null,
                            lessonDuration: existing?.lessonDuration || null,
                        };
                    })
                );

                results.push({ classCode: cls.classCode, success: true, courseCount: courses.length });
            } catch (error) {
                console.error(`Error initializing curriculum for class ${cls.classCode}:`, error);
                results.push({ classCode: cls.classCode, success: false, error: 'Failed to initialize' });
            }
        }

        const successCount = results.filter(r => r.success).length;
        res.json({
            message: `Initialized ${successCount} of ${classesNeedingInit.length} curricula`,
            initialized: successCount,
            results,
        });
    } catch (error) {
        console.error('Initialize curricula error:', error);
        res.status(500).json({ error: 'Failed to initialize curricula' });
    }
});

// === MENTOR MANAGEMENT ===

// Get mentors for a class
router.get('/classes/:classId/mentors', async (req: AuthRequest, res: Response) => {
    try {
        const classId = req.params.classId;

        // Get class and verify access
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

        // Get mentors for this class
        const mentorAssignments = await db.select()
            .from(classMentors)
            .where(eq(classMentors.classId, classId));

        // Get teacher details
        const teacherIds = mentorAssignments.map(m => m.teacherId);
        const mentorTeachers = teacherIds.length > 0
            ? await db.select()
                .from(teachers)
                .where(inArray(teachers.id, teacherIds))
            : [];

        const teacherMap = new Map(mentorTeachers.map(t => [t.id, t]));

        const mentors = mentorAssignments.map(m => ({
            id: m.id,
            teacherId: m.teacherId,
            teacherName: teacherMap.get(m.teacherId)?.name || 'Unknown',
            teacherEmail: teacherMap.get(m.teacherId)?.email || null,
            isPrimary: m.isPrimary === 1,
        }));

        res.json(mentors);
    } catch (error) {
        console.error('Get mentors error:', error);
        res.status(500).json({ error: 'Failed to get mentors' });
    }
});

// Assign a mentor to a class
router.post('/classes/:classId/mentors', async (req: AuthRequest, res: Response) => {
    try {
        const classId = req.params.classId;
        const { teacherId, isPrimary = true } = req.body;

        if (!teacherId) {
            return res.status(400).json({ error: 'teacherId is required' });
        }

        // Get class and verify access
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

        // Verify teacher exists and belongs to the same project
        const teacherData = await db.select()
            .from(teachers)
            .where(and(
                eq(teachers.id, teacherId),
                eq(teachers.projectId, classData[0].projectId)
            ))
            .limit(1);

        if (teacherData.length === 0) {
            return res.status(404).json({ error: 'Teacher not found in this project' });
        }

        // Check if already a mentor
        const existingMentor = await db.select()
            .from(classMentors)
            .where(and(
                eq(classMentors.classId, classId),
                eq(classMentors.teacherId, teacherId)
            ))
            .limit(1);

        if (existingMentor.length > 0) {
            return res.status(409).json({ error: 'Teacher is already a mentor for this class' });
        }

        // If isPrimary, update other mentors to not be primary
        if (isPrimary) {
            await db.update(classMentors)
                .set({ isPrimary: 0 })
                .where(eq(classMentors.classId, classId));
        }

        // Create mentor assignment
        const [newMentor] = await db.insert(classMentors).values({
            classId,
            teacherId,
            isPrimary: isPrimary ? 1 : 0,
        }).returning();

        res.status(201).json({
            id: newMentor.id,
            teacherId: newMentor.teacherId,
            teacherName: teacherData[0].name,
            isPrimary: newMentor.isPrimary === 1,
        });
    } catch (error) {
        console.error('Assign mentor error:', error);
        res.status(500).json({ error: 'Failed to assign mentor' });
    }
});

// Update mentor (e.g., set as primary)
router.put('/classes/:classId/mentors/:teacherId', async (req: AuthRequest, res: Response) => {
    try {
        const { classId, teacherId } = req.params;
        const { isPrimary } = req.body;

        // Get class and verify access
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

        // If setting as primary, update other mentors to not be primary
        if (isPrimary) {
            await db.update(classMentors)
                .set({ isPrimary: 0 })
                .where(eq(classMentors.classId, classId));
        }

        // Update mentor
        const [updatedMentor] = await db.update(classMentors)
            .set({ isPrimary: isPrimary ? 1 : 0 })
            .where(and(
                eq(classMentors.classId, classId),
                eq(classMentors.teacherId, teacherId)
            ))
            .returning();

        if (!updatedMentor) {
            return res.status(404).json({ error: 'Mentor assignment not found' });
        }

        res.json({
            id: updatedMentor.id,
            teacherId: updatedMentor.teacherId,
            isPrimary: updatedMentor.isPrimary === 1,
        });
    } catch (error) {
        console.error('Update mentor error:', error);
        res.status(500).json({ error: 'Failed to update mentor' });
    }
});

// Remove a mentor from a class
router.delete('/classes/:classId/mentors/:teacherId', async (req: AuthRequest, res: Response) => {
    try {
        const { classId, teacherId } = req.params;

        // Get class and verify access
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

        // Delete mentor assignment
        const [deletedMentor] = await db.delete(classMentors)
            .where(and(
                eq(classMentors.classId, classId),
                eq(classMentors.teacherId, teacherId)
            ))
            .returning();

        if (!deletedMentor) {
            return res.status(404).json({ error: 'Mentor assignment not found' });
        }

        res.json({ message: 'Mentor removed successfully' });
    } catch (error) {
        console.error('Remove mentor error:', error);
        res.status(500).json({ error: 'Failed to remove mentor' });
    }
});

export default router;
