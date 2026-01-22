import { loadSolverData } from '../src/solver/data-loader';
import { generateSchedule, preflightCheck } from '../src/solver';

const PROJECT_ID = '108da1ff-93d5-4d99-bb07-ac7064214518';
const USER_ID = 'b4310bbd-6bfb-419c-b9a6-36bc68a3a0e5';

async function testSchedule() {
    console.log('=== TEST SCHEMAGENERERING ===\n');

    const solverInput = await loadSolverData({
        projectId: PROJECT_ID,
        academicYear: '2026/2027',
        termType: 'fall',
        userId: USER_ID,
    });

    if (solverInput === null) {
        console.log('Kunde inte ladda data');
        process.exit(1);
    }

    console.log('Laddade:');
    console.log('  Kurser:', solverInput.courses.length);
    console.log('  Klasser:', solverInput.classes.length);
    console.log('  Lärare:', solverInput.teachers.length);
    console.log('  Salar:', solverInput.rooms.length);

    // Preflight check
    const preflight = preflightCheck(solverInput);
    console.log('\nPreflight:', preflight.valid ? 'OK' : 'Problem');
    if (preflight.issues.length > 0) {
        for (const issue of preflight.issues) {
            console.log('  -', issue);
        }
    }

    // Generate schedule
    console.log('\nGenererar schema...');
    const result = await generateSchedule(solverInput);

    console.log('\nResultat:');
    console.log('  Success:', result.success);
    console.log('  Status:', result.status);
    console.log('  Lektioner:', result.lessons.length);
    console.log('  Konflikter:', result.totalConflicts);
    console.log('  Tid:', result.solverTimeMs, 'ms');
    console.log('  Meddelande:', result.message);

    if (result.lessons.length > 0) {
        console.log('\nExempel på lektioner (första 5):');
        for (const lesson of result.lessons.slice(0, 5)) {
            console.log('  Dag', lesson.dayOfWeek, lesson.startTime, '-', lesson.endTime, ':', lesson.courseInstanceId.slice(0, 8) + '...');
        }
    }

    process.exit(0);
}

testSchedule().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
