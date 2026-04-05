/**
 * Testscript: Kör samma flöde som API:t vid schemagenerering – laddar solverdata,
 * gör preflight-check och genererar schema. Sparar inte resultatet.
 */
import 'dotenv/config';
import { db } from '../src/db';
import { projects } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { loadSolverData, generateSchedule, preflightCheck } from '../src/solver';

async function test() {
    const projectId = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';
    const academicYear = '2026/2027';
    const termType: 'fall' | 'spring' = 'fall';

    // Get the project's userId (like the API would have from auth)
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
        console.error('Project not found');
        process.exit(1);
    }

    console.log('Project:', project.name);
    console.log('User ID:', project.userId);
    console.log('Academic Year:', academicYear);
    console.log('Term Type:', termType);
    console.log();

    // Load solver data (like the API does)
    console.log('Loading solver data...');
    const solverInput = await loadSolverData({
        projectId,
        academicYear,
        termType,
        userId: project.userId,
    });

    if (!solverInput) {
        console.error('Failed to load solver data (null returned)');
        process.exit(1);
    }

    console.log(`Loaded ${solverInput.courses.length} courses`);
    console.log(`Loaded ${solverInput.classes.length} classes`);
    console.log(`Loaded ${solverInput.teachers.length} teachers`);
    console.log(`Loaded ${solverInput.rooms.length} rooms`);
    console.log();

    // Preflight check
    const preflight = preflightCheck(solverInput);
    console.log('Preflight:', preflight.valid ? 'PASSED' : 'FAILED');
    if (preflight.issues.length > 0) {
        console.log('Issues:', preflight.issues);
    }
    console.log();

    // Generate schedule
    console.log('Generating schedule...');
    const result = await generateSchedule(solverInput);

    console.log();
    console.log('=== RESULT ===');
    console.log('Success:', result.success);
    console.log('Status:', result.status);
    console.log('Lessons:', result.lessons.length);
    console.log('Message:', result.message || '(none)');

    if (result.lessons.length > 0) {
        console.log('\nFirst 5 lessons:');
        for (const lesson of result.lessons.slice(0, 5)) {
            console.log(`  ${lesson.dayOfWeek} ${lesson.startTime}: class=${lesson.classId.substring(0,8)}`);
        }
    }

    process.exit(result.success ? 0 : 1);
}

test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
