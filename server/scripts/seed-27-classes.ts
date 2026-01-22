/**
 * Seed script for realistic gymnasium with 27 classes
 *
 * 9 klasser i åk 1 (startår 2026) → tar åk1-kurser läsår 26/27
 * 9 klasser i åk 2 (startår 2025) → tar åk2-kurser läsår 26/27
 * 9 klasser i åk 3 (startår 2024) → tar åk3-kurser läsår 26/27
 *
 * Alla 27 klasser är aktiva läsår 2026/2027!
 */

import { db } from '../src/db';
import { projects, projectClasses, classCurricula, courseInstances, teachers, teacherServiceDistributions } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const PROJECT_ID = '108da1ff-93d5-4d99-bb07-ac7064214518';

// Program configurations
const PROGRAMS = [
    { code: 'TE', name: 'Teknikprogrammet', orientation: 'TEKTEK', orientationName: 'Teknik' },
    { code: 'NA', name: 'Naturvetenskapsprogrammet', orientation: 'NANAT', orientationName: 'Naturvetenskap' },
    { code: 'SA', name: 'Samhällsvetenskapsprogrammet', orientation: 'SASAM', orientationName: 'Samhällsvetenskap' },
];
const PARALLELS = ['a', 'b', 'c'];
const YEAR_LEVELS = [1, 2, 3];

// Course definitions by program and year
// Mål: ~850p per år, totalt 2500p per elev
type Course = { code: string; name: string; points: number; category: string };
const COURSES: Record<string, Record<number, Course[]>> = {
    // TEKNIKPROGRAMMET: 850 + 850 + 800 = 2500p
    TE: {
        1: [
            // Gymnasiegemensamma ämnen
            { code: 'SVESVE01', name: 'Svenska 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'ENGENG05', name: 'Engelska 5', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'MATMAT01c', name: 'Matematik 1c', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'IDHIDH01', name: 'Idrott och hälsa 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'HISHIS01a1', name: 'Historia 1a1', points: 50, category: 'FOUNDATIONAL_SUBJECTS' },
            // Programgemensamma ämnen
            { code: 'FYSFYS01a', name: 'Fysik 1', points: 150, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'KEMKEM01', name: 'Kemi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'TEKTEK01', name: 'Teknik 1', points: 150, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
        ], // = 850p
        2: [
            { code: 'SVESVE02', name: 'Svenska 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'ENGENG06', name: 'Engelska 6', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'MATMAT02c', name: 'Matematik 2c', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'HISHIS01a2', name: 'Historia 1a2', points: 50, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'SAMSAM01b', name: 'Samhällskunskap 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'RELREL01', name: 'Religionskunskap 1', points: 50, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'FYSFYS02', name: 'Fysik 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'TEKTEK02', name: 'Teknik 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'PRRPRR01', name: 'Programmering 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'KEMKEM02', name: 'Kemi 2', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
        ], // = 850p
        3: [
            { code: 'SVESVE03', name: 'Svenska 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'ENGENG07', name: 'Engelska 7', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'MATMAT03c', name: 'Matematik 3c', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'MATMAT04', name: 'Matematik 4', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'FYSFYS03', name: 'Fysik 3', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'PRRPRR02', name: 'Programmering 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'EXAEXMTE', name: 'Gymnasiearbete (Teknik)', points: 100, category: 'GYMNASIEARBETE' },
            // Individuellt val
            { code: 'INDTE01', name: 'Individuellt val - Teknik', points: 100, category: 'INDIVIDUAL_CHOICE' },
            { code: 'INDTE02', name: 'Individuellt val - Teknik 2', points: 100, category: 'INDIVIDUAL_CHOICE' },
        ], // = 900p
    },
    // NATURVETENSKAPSPROGRAMMET: 850 + 850 + 900 = 2600p
    NA: {
        1: [
            { code: 'SVESVE01', name: 'Svenska 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'ENGENG05', name: 'Engelska 5', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'MATMAT01c', name: 'Matematik 1c', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'IDHIDH01', name: 'Idrott och hälsa 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'HISHIS01a1', name: 'Historia 1a1', points: 50, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'FYSFYS01a', name: 'Fysik 1', points: 150, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'KEMKEM01', name: 'Kemi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'BIOBIO01', name: 'Biologi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'NAKNAK00S', name: 'Naturvetenskaplig grund', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
        ], // = 850p
        2: [
            { code: 'SVESVE02', name: 'Svenska 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'ENGENG06', name: 'Engelska 6', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'MATMAT02c', name: 'Matematik 2c', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'MATMAT03c', name: 'Matematik 3c', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'HISHIS01a2', name: 'Historia 1a2', points: 50, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'SAMSAM01b', name: 'Samhällskunskap 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'RELREL01', name: 'Religionskunskap 1', points: 50, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'FYSFYS02', name: 'Fysik 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'KEMKEM02', name: 'Kemi 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'BIOBIO02', name: 'Biologi 2', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
        ], // = 850p
        3: [
            { code: 'SVESVE03', name: 'Svenska 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'ENGENG07', name: 'Engelska 7', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'MATMAT04', name: 'Matematik 4', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'MATMAT05', name: 'Matematik 5', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'KEMKEM03', name: 'Kemi 2 forts', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'BIOBIO03', name: 'Biologi 2 forts', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'EXAEXMNA', name: 'Gymnasiearbete (Natur)', points: 100, category: 'GYMNASIEARBETE' },
            // Individuellt val
            { code: 'INDNA01', name: 'Individuellt val - Natur', points: 100, category: 'INDIVIDUAL_CHOICE' },
            { code: 'INDNA02', name: 'Individuellt val - Natur 2', points: 100, category: 'INDIVIDUAL_CHOICE' },
        ], // = 900p
    },
    // SAMHÄLLSVETENSKAPSPROGRAMMET: 850 + 850 + 800 = 2500p
    SA: {
        1: [
            { code: 'SVESVE01', name: 'Svenska 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'ENGENG05', name: 'Engelska 5', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'MATMAT01b', name: 'Matematik 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'IDHIDH01', name: 'Idrott och hälsa 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'HISHIS01b', name: 'Historia 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'SAMSAM01b', name: 'Samhällskunskap 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'RELREL01', name: 'Religionskunskap 1', points: 50, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'GEOGEO01', name: 'Geografi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'MODSPR01', name: 'Moderna språk 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
        ], // = 850p
        2: [
            { code: 'SVESVE02', name: 'Svenska 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'ENGENG06', name: 'Engelska 6', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'MATMAT02b', name: 'Matematik 2b', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'NAKNAF01b', name: 'Naturkunskap 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'HISHIS02b', name: 'Historia 2b - Loss', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'SAMSAM02', name: 'Samhällskunskap 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'RELREL02', name: 'Religionskunskap 2', points: 50, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'PSYPSY01', name: 'Psykologi 1', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'MODSPR02', name: 'Moderna språk 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'GEOGEO02', name: 'Geografi 2', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
        ], // = 850p
        3: [
            { code: 'SVESVE03', name: 'Svenska 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS' },
            { code: 'ENGENG07', name: 'Engelska 7', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'SAMSAM03', name: 'Samhällskunskap 3', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'PSYPSY02a', name: 'Psykologi 2', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'MODSPR03', name: 'Moderna språk 3', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'FILFIL01', name: 'Filosofi 1', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'HISHIS03', name: 'Historia 3', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS' },
            { code: 'EXAEXMSA', name: 'Gymnasiearbete (Samhälle)', points: 100, category: 'GYMNASIEARBETE' },
            // Individuellt val
            { code: 'INDSA01', name: 'Individuellt val - Samhälle', points: 100, category: 'INDIVIDUAL_CHOICE' },
            { code: 'INDSA02', name: 'Individuellt val - Samhälle 2', points: 100, category: 'INDIVIDUAL_CHOICE' },
        ], // = 900p
    },
};

async function seedProject() {
    console.log('=== SKAPAR GYMNASIUM MED 27 KLASSER ===\n');

    // Delete existing classes and related data
    const existingClasses = await db.select().from(projectClasses).where(eq(projectClasses.projectId, PROJECT_ID));
    if (existingClasses.length > 0) {
        console.log(`Tar bort ${existingClasses.length} befintliga klasser...`);
        const classIds = existingClasses.map(c => c.id);
        await db.delete(courseInstances).where(inArray(courseInstances.classId, classIds));
        await db.delete(classCurricula).where(inArray(classCurricula.classId, classIds));
        await db.delete(projectClasses).where(inArray(projectClasses.id, classIds));
    }

    // Delete existing teachers
    const existingTeachers = await db.select().from(teachers).where(eq(teachers.projectId, PROJECT_ID));
    if (existingTeachers.length > 0) {
        console.log(`Tar bort ${existingTeachers.length} befintliga lärare...`);
        const teacherIds = existingTeachers.map(t => t.id);
        await db.delete(teacherServiceDistributions).where(inArray(teacherServiceDistributions.teacherId, teacherIds));
        await db.delete(teachers).where(inArray(teachers.id, teacherIds));
    }

    console.log('\n=== SKAPAR 27 KLASSER ===\n');

    const createdClasses: Array<{ id: string; classCode: string; program: string; yearLevel: number; startYear: number }> = [];

    for (const yearLevel of YEAR_LEVELS) {
        // Calculate start year so that academic year 2026/2027 is correct
        const startYear = 2026 - (yearLevel - 1);
        const graduationYear = startYear + 3;

        for (const program of PROGRAMS) {
            for (const parallel of PARALLELS) {
                const classCode = `${program.code}${yearLevel}${parallel}`;

                // Create class
                const [newClass] = await db.insert(projectClasses).values({
                    projectId: PROJECT_ID,
                    classCode: classCode,
                    programCode: program.code,
                    programName: program.name,
                    orientationCode: program.orientation,
                    orientationName: program.orientationName,
                    startYear: startYear,
                    graduationYear: graduationYear,
                }).returning();

                // Create curriculum
                const [curriculum] = await db.insert(classCurricula).values({
                    classId: newClass.id,
                    totalPoints: 0,
                    status: 'draft',
                }).returning();

                // Create course instances for ALL THREE YEARS (complete 2500p curriculum)
                let totalPoints = 0;
                for (const courseYear of [1, 2, 3]) {
                    const coursesForYear = COURSES[program.code][courseYear];
                    for (const course of coursesForYear) {
                        await db.insert(courseInstances).values({
                            curriculumId: curriculum.id,
                            classId: newClass.id,
                            courseCode: course.code,
                            courseName: course.name,
                            points: course.points,
                            category: course.category,
                            year: courseYear,
                            terms: ['HT', 'VT'], // Full year
                        });
                        totalPoints += course.points;
                    }
                }

                // Update curriculum total points and mark as valid
                await db.update(classCurricula)
                    .set({ totalPoints, isValid: 1, status: 'approved' })
                    .where(eq(classCurricula.id, curriculum.id));

                createdClasses.push({
                    id: newClass.id,
                    classCode,
                    program: program.code,
                    yearLevel,
                    startYear,
                });

                console.log(`  ${classCode} (startår ${startYear}, åk ${yearLevel}, ${totalPoints}p)`);
            }
        }
    }

    // Count courses and points
    const classIds = createdClasses.map(c => c.id);
    const allCourses = await db.select().from(courseInstances).where(inArray(courseInstances.classId, classIds));
    const totalPoints = allCourses.reduce((sum, c) => sum + c.points, 0);

    console.log('\n=== SAMMANFATTNING LÄSÅR 2026/2027 ===\n');
    console.log(`Antal klasser: ${createdClasses.length}`);
    console.log(`Antal kursinstanser: ${allCourses.length}`);
    console.log(`Totala poäng: ${totalPoints}p`);

    // Points by year level
    const pointsByYear: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const course of allCourses) {
        pointsByYear[course.year] = (pointsByYear[course.year] || 0) + course.points;
    }

    console.log(`\nPoäng per årskurs:`);
    console.log(`  Åk 1 (9 klasser): ${pointsByYear[1]}p`);
    console.log(`  Åk 2 (9 klasser): ${pointsByYear[2]}p`);
    console.log(`  Åk 3 (9 klasser): ${pointsByYear[3]}p`);

    console.log(`\n=== LÄRARBEHOV ===`);
    console.log(`Med 600p-gräns: ${Math.ceil(totalPoints / 600)} lärare`);
    console.log(`Med 550p snitt: ${Math.ceil(totalPoints / 550)} lärare`);

    process.exit(0);
}

seedProject().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
