/**
 * Engångsscript: Fördelar kursinstanser över terminer. De flesta kurser sätts som
 * helårskurser (HT+VT), medan individuellt val delas upp per termin.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projectClasses, courseInstances, classCurricula } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const PROJECT_ID = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';

interface CourseToDistribute {
    id: string;
    courseCode: string;
    courseName: string;
    points: number;
    year: number;
    category: string;
}

async function distributeCourses() {
    console.log('🎯 Fördelar kurser över terminer (strategi: helårskurser)...\n');

    // Hämta alla klasser
    const classes = await db.select().from(projectClasses).where(eq(projectClasses.projectId, PROJECT_ID));
    console.log(`Hittade ${classes.length} klasser\n`);

    // Hämta alla curricula
    const classIds = classes.map(c => c.id);
    const curricula = await db.select().from(classCurricula).where(inArray(classCurricula.classId, classIds));

    // Hämta alla kursinstanser
    const curriculumIds = curricula.map(c => c.id);
    const allInstances = await db.select().from(courseInstances).where(inArray(courseInstances.curriculumId, curriculumIds));

    console.log(`Totalt ${allInstances.length} kursinstanser att fördela\n`);

    let totalUpdated = 0;

    // Processa varje klass
    for (const cls of classes) {
        const curriculum = curricula.find(c => c.classId === cls.id);
        if (!curriculum) continue;

        const instances = allInstances.filter(i => i.curriculumId === curriculum.id);

        for (const inst of instances) {
            let newTerms: string[];

            // Individuellt val: dela upp per termin
            if (inst.courseCode === 'INDIVIDUAL_CHOICE_1' || inst.courseCode.includes('INDVAL_1') || inst.courseCode.includes('INDTE01') || inst.courseCode.includes('INDNA01') || inst.courseCode.includes('INDSA01')) {
                newTerms = ['HT'];
            } else if (inst.courseCode === 'INDIVIDUAL_CHOICE_2' || inst.courseCode.includes('INDVAL_2') || inst.courseCode.includes('INDTE02') || inst.courseCode.includes('INDNA02') || inst.courseCode.includes('INDSA02')) {
                newTerms = ['VT'];
            } else {
                // Alla andra kurser körs hela året
                newTerms = ['HT', 'VT'];
            }

            await db.update(courseInstances)
                .set({ terms: newTerms })
                .where(eq(courseInstances.id, inst.id));
            totalUpdated++;
        }
    }

    console.log(`\n✅ Uppdaterade ${totalUpdated} kursinstanser`);

    // Verifiera fördelning
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

    // Räkna fördelning
    let htOnlyCount = 0;
    let vtOnlyCount = 0;
    let fullYearCount = 0;

    for (const inst of allInstances) {
        const terms = inst.terms as string[];
        if (terms.length === 1 && terms[0] === 'HT') htOnlyCount++;
        else if (terms.length === 1 && terms[0] === 'VT') vtOnlyCount++;
        else if (terms.length === 2) fullYearCount++;
    }

    console.log('Fördelning:');
    console.log(`  Endast HT: ${htOnlyCount} kurser`);
    console.log(`  Endast VT: ${vtOnlyCount} kurser`);
    console.log(`  Hela året: ${fullYearCount} kurser`);

    // Beräkna förväntade veckotimmar för en klass
    const sampleClass = classes[0];
    const sampleCurriculum = curricula.find(c => c.classId === sampleClass.id);
    if (sampleCurriculum) {
        const sampleInstances = allInstances.filter(i => i.curriculumId === sampleCurriculum.id);

        console.log(`\n📋 Exempel: ${sampleClass.classCode}`);

        for (const year of [1, 2, 3]) {
            const yearCourses = sampleInstances.filter(i => i.year === year);
            if (yearCourses.length === 0) continue;

            let totalPoints = 0;
            let htMinutes = 0;
            let vtMinutes = 0;

            for (const course of yearCourses) {
                const terms = course.terms as string[];
                totalPoints += course.points;

                // Beräkna minuter per vecka
                // 1 poäng = 60 minuter total undervisningstid
                const totalMinutes = course.points * 60;

                if (terms.length === 2) {
                    // Helårskurs: 39 veckor
                    const minutesPerWeek = totalMinutes / 39;
                    htMinutes += minutesPerWeek;
                    vtMinutes += minutesPerWeek;
                } else if (terms[0] === 'HT') {
                    // Endast hösttermin: 17 veckor
                    htMinutes += totalMinutes / 17;
                } else if (terms[0] === 'VT') {
                    // Endast vårtermin: 22 veckor
                    vtMinutes += totalMinutes / 22;
                }
            }

            const htHours = Math.round(htMinutes / 60 * 10) / 10;
            const vtHours = Math.round(vtMinutes / 60 * 10) / 10;

            console.log(`  År ${year}: ${totalPoints}p totalt, HT=${htHours}h/vecka, VT=${vtHours}h/vecka (${yearCourses.length} kurser)`);
        }
    }
}

distributeCourses().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
