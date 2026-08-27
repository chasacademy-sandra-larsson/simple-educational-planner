/**
 * Engångsscript: Fördelar kurser över gymnasieår 1–3 (~850p/år) baserat på
 * kurskategori. Grundämnen → år 1–2, programfördjupning → år 2–3, gymnasiearbete → år 3.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projectClasses, courseInstances, classCurricula } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const PROJECT_ID = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';
const TARGET_POINTS_PER_YEAR = 850;

async function distributeCourseYears() {
    console.log('🎯 Fördelar kurser över gymnasieår...\n');

    const classes = await db.select().from(projectClasses).where(eq(projectClasses.projectId, PROJECT_ID));
    console.log(`Hittade ${classes.length} klasser\n`);

    const classIds = classes.map(c => c.id);
    const curricula = await db.select().from(classCurricula).where(inArray(classCurricula.classId, classIds));
    const curriculumIds = curricula.map(c => c.id);
    const allInstances = await db.select().from(courseInstances).where(inArray(courseInstances.curriculumId, curriculumIds));

    console.log(`Totalt ${allInstances.length} kursinstanser\n`);

    let totalUpdated = 0;

    // Processa varje klass
    for (const cls of classes) {
        const curriculum = curricula.find(c => c.classId === cls.id);
        if (!curriculum) continue;

        const instances = allInstances.filter(i => i.curriculumId === curriculum.id);

        // Sortera kurser efter kategori och poäng
        const sortedCourses = [...instances].sort((a, b) => {
            // Prioritera FOUNDATIONAL och PROGRAMME_SPECIFIC först
            const categoryOrder: Record<string, number> = {
                'FOUNDATIONAL_SUBJECTS': 1,
                'PROGRAMME_SPECIFIC_SUBJECTS': 2,
                'ORIENTATION': 3,
                'PROGRAMME_SPECIALIZATION': 4,
                'INDIVIDUAL_CHOICE': 5,
                'GYMNASIEARBETE': 6,
            };
            const catDiff = (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
            if (catDiff !== 0) return catDiff;
            return b.points - a.points; // Större kurser först
        });

        // Fördela kurser över år
        let year1Points = 0;
        let year2Points = 0;
        let year3Points = 0;

        for (const course of sortedCourses) {
            let assignedYear: number;

            // Gymnasiearbete alltid år 3
            if (course.category === 'GYMNASIEARBETE' || course.courseCode === 'GYMNASIEARBETE') {
                assignedYear = 3;
            }
            // Individuellt val alltid år 3
            else if (course.category === 'INDIVIDUAL_CHOICE' ||
                     course.courseCode.includes('INDIVIDUAL_CHOICE') ||
                     course.courseCode.includes('INDTE') ||
                     course.courseCode.includes('INDNA') ||
                     course.courseCode.includes('INDSA')) {
                assignedYear = 3;
            }
            // Programfördjupning (ORIENTATION) - fördela år 2-3
            else if (course.category === 'ORIENTATION') {
                if (year2Points + course.points <= TARGET_POINTS_PER_YEAR + 100) {
                    assignedYear = 2;
                } else {
                    assignedYear = 3;
                }
            }
            // Grundläggande och programgemensamma - fördela år 1-2
            else {
                if (year1Points + course.points <= TARGET_POINTS_PER_YEAR) {
                    assignedYear = 1;
                } else if (year2Points + course.points <= TARGET_POINTS_PER_YEAR) {
                    assignedYear = 2;
                } else {
                    assignedYear = 3;
                }
            }

            // Uppdatera räknare
            if (assignedYear === 1) year1Points += course.points;
            else if (assignedYear === 2) year2Points += course.points;
            else year3Points += course.points;

            // Uppdatera databas
            await db.update(courseInstances)
                .set({
                    year: assignedYear,
                    terms: ['HT', 'VT'], // Alla kurser körs hela året
                })
                .where(eq(courseInstances.id, course.id));
            totalUpdated++;
        }

        // Visa fördelning för denna klass
        if (cls.classCode === 'TE1a') {
            console.log(`${cls.classCode}: År 1=${year1Points}p, År 2=${year2Points}p, År 3=${year3Points}p`);
        }
    }

    console.log(`\n✅ Uppdaterade ${totalUpdated} kursinstanser`);

    // Verifiera
    await verifyDistribution();

    process.exit(0);
}

async function verifyDistribution() {
    console.log('\n📊 Verifierar fördelning...\n');

    const classes = await db.select().from(projectClasses).where(eq(projectClasses.projectId, PROJECT_ID));
    const classIds = classes.map(c => c.id);
    const curricula = await db.select().from(classCurricula).where(inArray(classCurricula.classId, classIds));
    const curriculumIds = curricula.map(c => c.id);
    const allInstances = await db.select().from(courseInstances).where(inArray(courseInstances.curriculumId, curriculumIds));

    // Visa exempel för några klasser
    for (const cls of classes.slice(0, 3)) {
        const curriculum = curricula.find(c => c.classId === cls.id);
        if (!curriculum) continue;

        const instances = allInstances.filter(i => i.curriculumId === curriculum.id);

        const byYear: Record<number, { count: number; points: number }> = { 1: { count: 0, points: 0 }, 2: { count: 0, points: 0 }, 3: { count: 0, points: 0 } };
        for (const inst of instances) {
            byYear[inst.year].count++;
            byYear[inst.year].points += inst.points;
        }

        console.log(`${cls.classCode}:`);
        for (const year of [1, 2, 3]) {
            const data = byYear[year];
            // Beräkna timmar per vecka (helårskurs = 39 veckor)
            const hoursPerWeek = Math.round((data.points * 60 / 39 / 60) * 10) / 10;
            console.log(`  År ${year}: ${data.count} kurser, ${data.points}p, ~${hoursPerWeek}h/vecka`);
        }
    }
}

distributeCourseYears().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
