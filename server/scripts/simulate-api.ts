/**
 * Testscript: Simulerar hela API-flödet för schemagenerering – laddar solverdata,
 * kör solvern, sparar schema och lektioner i databasen.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projects, generatedSchedules, scheduledLessons } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { loadSolverData, generateSchedule } from '../src/solver';

async function simulateAPI() {
    const projectId = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';
    const academicYear = '2026/2027';
    const termType: 'fall' | 'spring' = 'fall';

    // Get project owner
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
        console.log('Project not found');
        process.exit(1);
    }
    const userId = project.userId;

    console.log('1. Loading solver data...');
    const solverInput = await loadSolverData({ projectId, academicYear, termType, userId });

    if (!solverInput) {
        console.log('   FAILED: solverInput is null');
        process.exit(1);
    }

    console.log('   Courses:', solverInput.courses.length);
    console.log('   Classes:', solverInput.classes.length);

    console.log('\n2. Running solver...');
    const result = await generateSchedule(solverInput);

    console.log('   Success:', result.success);
    console.log('   Status:', result.status);
    console.log('   Lessons:', result.lessons.length);

    console.log('\n3. Saving schedule...');
    const [newSchedule] = await db.insert(generatedSchedules).values({
        projectId,
        name: 'Test Schema',
        academicYear,
        termType,
        status: result.success ? 'draft' : 'failed',
        solverStatus: result.status,
        solverTimeMs: result.solverTimeMs,
        totalConflicts: result.totalConflicts,
    }).returning();

    console.log('   Schedule ID:', newSchedule.id);

    console.log('\n4. Saving lessons...');
    if (result.success && result.lessons.length > 0) {
        try {
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
            console.log('   Saved', result.lessons.length, 'lessons');
        } catch (err) {
            console.log('   ERROR saving lessons:', err);
        }
    } else {
        console.log('   No lessons to save (success=' + result.success + ', lessons=' + result.lessons.length + ')');
    }

    // Verify
    const savedLessons = await db.select().from(scheduledLessons).where(eq(scheduledLessons.scheduleId, newSchedule.id));
    console.log('\n5. Verification:', savedLessons.length, 'lessons in DB');

    process.exit(0);
}

simulateAPI();
