/**
 * Debugscript: Undersöker solverdata – visar klasser, kursinstanser, termfördelning
 * och lärartilldelning för att verifiera att dataloadern får rätt input.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projects, projectClasses, courseInstances, classCurricula } from '../src/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

async function test() {
    const projectId = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';
    const academicYear = '2026/2027';
    const termType = 'fall';

    // Get project with its user
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) {
        console.log('Project not found');
        process.exit(1);
    }
    console.log('Project:', project.name, 'User:', project.userId);

    // Load classes
    const classesData = await db.select()
        .from(projectClasses)
        .where(eq(projectClasses.projectId, projectId));
    console.log('\nTotal classes:', classesData.length);

    // Calculate gymnasium year for each class
    const academicStartYear = parseInt(academicYear.split('/')[0]);
    const classYearMap = new Map<string, { classCode: string; year: number }>();
    const yearCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

    for (const cls of classesData) {
        const gymnasiumYear = academicStartYear - cls.startYear + 1;
        if (gymnasiumYear >= 1 && gymnasiumYear <= 3) {
            classYearMap.set(cls.id, { classCode: cls.classCode, year: gymnasiumYear });
            yearCounts[gymnasiumYear]++;
        }
    }
    console.log('Classes per gymnasium year:', yearCounts);

    // Load curricula
    const classIds = classesData.map(c => c.id);
    const curricula = await db.select()
        .from(classCurricula)
        .where(inArray(classCurricula.classId, classIds));
    console.log('Total curricula:', curricula.length);

    // Get active curricula (one per class)
    const activeCurriculaIds: string[] = [];
    for (const c of classesData) {
        const classCurr = curricula
            .filter(curr => curr.classId === c.id && (curr.status === 'approved' || curr.status === 'draft'))
            .sort((a, b) => {
                if (a.status === 'approved' && b.status === 'draft') return -1;
                if (a.status === 'draft' && b.status === 'approved') return 1;
                return b.version - a.version;
            })[0];
        if (classCurr) {
            activeCurriculaIds.push(classCurr.id);
        }
    }
    console.log('Active curricula:', activeCurriculaIds.length);

    // Load course instances
    const instances = activeCurriculaIds.length > 0
        ? await db.select()
            .from(courseInstances)
            .where(inArray(courseInstances.curriculumId, activeCurriculaIds))
        : [];
    console.log('Total course instances:', instances.length);

    // Check instance years
    const instanceYearCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const inst of instances) {
        instanceYearCounts[inst.year] = (instanceYearCounts[inst.year] || 0) + 1;
    }
    console.log('Course instances per year:', instanceYearCounts);

    // Filter courses like the data-loader does
    let matchingCourses = 0;
    let nonMatchingCourses = 0;
    const coursesPerYear: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

    for (const instance of instances) {
        const classInfo = classYearMap.get(instance.classId);
        if (!classInfo) continue;

        if (instance.year === classInfo.year) {
            matchingCourses++;
            coursesPerYear[classInfo.year]++;
        } else {
            nonMatchingCourses++;
        }
    }

    console.log('\n=== Filtering results for', academicYear, termType, '===');
    console.log('Matching courses (course.year === class gymnasium year):', matchingCourses);
    console.log('Non-matching courses:', nonMatchingCourses);
    console.log('Courses per year:', coursesPerYear);

    // Check terms
    const termCounts: Record<string, number> = {};
    for (const instance of instances) {
        const terms = instance.terms as string[];
        for (const term of terms) {
            termCounts[term] = (termCounts[term] || 0) + 1;
        }
    }
    console.log('\nTerms distribution:', termCounts);

    // Check teachers
    let withTeacher = 0;
    let withoutTeacher = 0;
    for (const instance of instances) {
        if (instance.teacherId) {
            withTeacher++;
        } else {
            withoutTeacher++;
        }
    }
    console.log('\nWith teacher:', withTeacher);
    console.log('Without teacher:', withoutTeacher);

    process.exit(0);
}

test().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
