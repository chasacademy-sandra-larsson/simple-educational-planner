import { db } from '../src/db';
import { courseInstances, projectClasses, teachers } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const PROJECT_ID = '108da1ff-93d5-4d99-bb07-ac7064214518';
const ACADEMIC_YEAR = '2026/2027';

async function checkCourses() {
    console.log('=== KURSER FÖR LÄSÅR 2026/2027 ===\n');

    const classes = await db.select().from(projectClasses).where(eq(projectClasses.projectId, PROJECT_ID));
    const classIds = classes.map(c => c.id);
    const allCourses = await db.select().from(courseInstances).where(inArray(courseInstances.classId, classIds));
    const allTeachers = await db.select().from(teachers).where(eq(teachers.projectId, PROJECT_ID));

    const teacherMap = new Map(allTeachers.map(t => [t.id, t]));

    // Filtrera kurser för 2026/2027
    const coursesFor2026 = allCourses.filter(course => {
        const cls = classes.find(c => c.id === course.classId);
        if (!cls) return false;
        const classYearLevel = 2026 - cls.startYear + 1;
        return course.year === classYearLevel;
    });

    const withTeacher = coursesFor2026.filter(c => c.teacherId);
    const withoutTeacher = coursesFor2026.filter(c => !c.teacherId);

    console.log('Kurser att schemalägga 2026/2027:', coursesFor2026.length);
    console.log('Med lärare:', withTeacher.length);
    console.log('Utan lärare:', withoutTeacher.length);

    if (withoutTeacher.length > 0) {
        console.log('\nKurser UTAN lärare för 2026/2027:');
        for (const c of withoutTeacher) {
            const cls = classes.find(cl => cl.id === c.classId);
            console.log('  ', cls?.classCode, '-', c.courseCode, '(' + c.points + 'p)');
        }
    }

    // Visa per klass
    console.log('\n=== PER KLASS ===\n');
    for (const cls of classes.sort((a, b) => a.classCode.localeCompare(b.classCode))) {
        const classYearLevel = 2026 - cls.startYear + 1;
        const classCourses = coursesFor2026.filter(c => c.classId === cls.id);
        const hasTeacher = classCourses.filter(c => c.teacherId);

        if (classCourses.length > 0) {
            const missing = classCourses.length - hasTeacher.length;
            const status = missing === 0 ? '✓' : '✗';
            console.log(status, cls.classCode, '(åk ' + classYearLevel + '):', hasTeacher.length + '/' + classCourses.length, 'kurser har lärare');

            if (missing > 0) {
                for (const c of classCourses.filter(c => !c.teacherId)) {
                    console.log('    SAKNAR:', c.courseCode);
                }
            }
        }
    }

    process.exit(0);
}

checkCourses().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
