import { db } from '../src/db';
import { courseInstances, projectClasses, teachers } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const PROJECT_ID = '108da1ff-93d5-4d99-bb07-ac7064214518';

async function checkConnections() {
    console.log('=== KOPPLING KURS-KLASS-LÄRARE ===\n');

    const classes = await db.select().from(projectClasses).where(eq(projectClasses.projectId, PROJECT_ID));
    const classIds = classes.map(c => c.id);
    const courses = await db.select().from(courseInstances).where(inArray(courseInstances.classId, classIds));

    const withTeacher = courses.filter(c => c.teacherId !== null && c.teacherId !== undefined);
    const withoutTeacher = courses.filter(c => c.teacherId === null || c.teacherId === undefined);

    console.log('Totalt antal kursinstanser:', courses.length);
    console.log('Med lärare tilldelad:', withTeacher.length);
    console.log('Utan lärare:', withoutTeacher.length);

    console.log('\nExempel på kurser MED lärare (första 5):');
    for (const c of withTeacher.slice(0, 5)) {
        const cls = classes.find(cl => cl.id === c.classId);
        const teacherResult = c.teacherId
            ? await db.select().from(teachers).where(eq(teachers.id, c.teacherId))
            : [];
        const teacher = teacherResult[0];
        console.log('  ', cls?.classCode, '-', c.courseCode, '(år ' + c.year + ') ->', teacher?.name || 'ingen');
    }

    if (withoutTeacher.length > 0) {
        console.log('\nExempel på kurser UTAN lärare (första 10):');
        for (const c of withoutTeacher.slice(0, 10)) {
            const cls = classes.find(cl => cl.id === c.classId);
            console.log('  ', cls?.classCode, '-', c.courseCode, '(år ' + c.year + ')');
        }
    }

    console.log('\nKurser med lärare per årskurs:');
    for (const year of [1, 2, 3]) {
        const yearCourses = courses.filter(c => c.year === year);
        const yearWithTeacher = yearCourses.filter(c => c.teacherId !== null && c.teacherId !== undefined);
        console.log('  Åk', year + ':', yearWithTeacher.length, '/', yearCourses.length);
    }

    process.exit(0);
}

checkConnections().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
