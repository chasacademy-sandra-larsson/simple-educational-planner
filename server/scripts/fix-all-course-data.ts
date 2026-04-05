/**
 * Engångsscript: Fixar kursdata genom att fördela kurser jämnt över år 1–3 (~850p/år)
 * baserat på kategori och sätter termer till ['HT', 'VT'].
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projectClasses, courseInstances, classCurricula } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const PROJECT_ID = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';
const TARGET_POINTS_PER_YEAR = 850;

async function fixAll() {
    console.log('🔧 Fixar all kursdata...\n');

    const classes = await db.select().from(projectClasses).where(eq(projectClasses.projectId, PROJECT_ID));
    const classIds = classes.map(c => c.id);
    const curricula = await db.select().from(classCurricula).where(inArray(classCurricula.classId, classIds));
    const curriculumIds = curricula.map(c => c.id);
    const allInstances = await db.select().from(courseInstances).where(inArray(courseInstances.curriculumId, curriculumIds));

    console.log(`Klasser: ${classes.length}`);
    console.log(`Kursinstanser: ${allInstances.length}\n`);

    // Process each class
    for (const cls of classes) {
        const curriculum = curricula.find(c => c.classId === cls.id);
        if (!curriculum) continue;

        const instances = allInstances.filter(i => i.curriculumId === curriculum.id);

        // Sort courses for distribution
        const sortedCourses = [...instances].sort((a, b) => {
            const categoryOrder: Record<string, number> = {
                'FOUNDATIONAL_SUBJECTS': 1,
                'PROGRAMME_SPECIFIC_SUBJECTS': 2,
                'ORIENTATION': 3,
                'INDIVIDUAL_CHOICE': 4,
                'GYMNASIEARBETE': 5,
            };
            const catDiff = (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
            if (catDiff !== 0) return catDiff;
            return b.points - a.points;
        });

        let year1Points = 0;
        let year2Points = 0;
        let year3Points = 0;

        for (const course of sortedCourses) {
            let assignedYear: number;

            if (course.category === 'GYMNASIEARBETE' || course.courseCode === 'GYMNASIEARBETE') {
                assignedYear = 3;
            } else if (course.category === 'INDIVIDUAL_CHOICE' ||
                       course.courseCode.includes('INDIVIDUAL_CHOICE') ||
                       course.courseCode.includes('INDTE') ||
                       course.courseCode.includes('INDNA') ||
                       course.courseCode.includes('INDSA')) {
                assignedYear = 3;
            } else if (course.category === 'ORIENTATION') {
                if (year2Points + course.points <= TARGET_POINTS_PER_YEAR + 100) {
                    assignedYear = 2;
                } else {
                    assignedYear = 3;
                }
            } else {
                if (year1Points + course.points <= TARGET_POINTS_PER_YEAR) {
                    assignedYear = 1;
                } else if (year2Points + course.points <= TARGET_POINTS_PER_YEAR) {
                    assignedYear = 2;
                } else {
                    assignedYear = 3;
                }
            }

            if (assignedYear === 1) year1Points += course.points;
            else if (assignedYear === 2) year2Points += course.points;
            else year3Points += course.points;

            // Update both year AND terms
            await db.update(courseInstances)
                .set({
                    year: assignedYear,
                    terms: ['HT', 'VT'],
                })
                .where(eq(courseInstances.id, course.id));
        }

        if (cls.classCode === 'TE1a') {
            console.log(`${cls.classCode}: År1=${year1Points}p, År2=${year2Points}p, År3=${year3Points}p`);
        }
    }

    // Verify
    console.log('\n📊 Verifierar...');
    const sample = await db.select().from(courseInstances).where(inArray(courseInstances.curriculumId, curriculumIds)).limit(5);
    for (const inst of sample) {
        console.log(`  ${inst.courseCode}: year=${inst.year}, terms=${JSON.stringify(inst.terms)}`);
    }

    // Count per year
    const updated = await db.select().from(courseInstances).where(inArray(courseInstances.curriculumId, curriculumIds));
    const yearCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const inst of updated) {
        yearCounts[inst.year] = (yearCounts[inst.year] || 0) + 1;
    }
    console.log('\nKurser per år:', yearCounts);

    console.log('\n✅ Klar!');
    process.exit(0);
}

fixAll().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
