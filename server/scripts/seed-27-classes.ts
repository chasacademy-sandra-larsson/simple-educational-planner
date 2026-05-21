/**
 * Seed-script (npm run db:seed-27): Skapar ett gymnasium med 27 klasser (TE/NA/SA × 3
 * paralleller × 3 årskurser), kompletta kursplaner (2500p/elev), 20 lärare, 25 salar
 * och mentortilldelningar. Körs för läsår 2026/2027.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projects, projectClasses, classCurricula, courseInstances, teachers, teacherServiceDistributions, users, rooms, classMentors } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Will be set after finding/creating user and project
let PROJECT_ID = '';

// Program configurations (orientation codes from Skolverket API)
const PROGRAMS = [
    { code: 'TE', name: 'Teknikprogrammet', orientation: 'TETEK', orientationName: 'Teknikvetenskap' },
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
            { code: 'ENGENG07', name: 'Engelska 7', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'MATMAT03c', name: 'Matematik 3c', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'FYSFYS03', name: 'Fysik 3', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'PRRPRR02', name: 'Programmering 2', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'EXAEXMTE', name: 'Gymnasiearbete (Teknik)', points: 100, category: 'GYMNASIEARBETE' },
            // Individuellt val - alltid 200p
            { code: 'INDTE01', name: 'Individuellt val 1', points: 100, category: 'INDIVIDUAL_CHOICE' },
            { code: 'INDTE02', name: 'Individuellt val 2', points: 100, category: 'INDIVIDUAL_CHOICE' },
        ], // = 800p
    },
    // NATURVETENSKAPSPROGRAMMET: 850 + 850 + 800 = 2500p
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
            { code: 'ENGENG07', name: 'Engelska 7', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'MATMAT04', name: 'Matematik 4', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'KEMKEM03', name: 'Kemi 2 forts', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'BIOBIO03', name: 'Biologi 2 forts', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'EXAEXMNA', name: 'Gymnasiearbete (Natur)', points: 100, category: 'GYMNASIEARBETE' },
            // Individuellt val - alltid 200p
            { code: 'INDNA01', name: 'Individuellt val 1', points: 100, category: 'INDIVIDUAL_CHOICE' },
            { code: 'INDNA02', name: 'Individuellt val 2', points: 100, category: 'INDIVIDUAL_CHOICE' },
        ], // = 800p
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
            { code: 'ENGENG07', name: 'Engelska 7', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'SAMSAM03', name: 'Samhällskunskap 3', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'PSYPSY02a', name: 'Psykologi 2', points: 50, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'MODSPR03', name: 'Moderna språk 3', points: 100, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'FILFIL01', name: 'Filosofi 1', points: 50, category: 'PROGRAMME_SPECIALIZATION' },
            { code: 'EXAEXMSA', name: 'Gymnasiearbete (Samhälle)', points: 100, category: 'GYMNASIEARBETE' },
            // Individuellt val - alltid 200p
            { code: 'INDSA01', name: 'Individuellt val 1', points: 100, category: 'INDIVIDUAL_CHOICE' },
            { code: 'INDSA02', name: 'Individuellt val 2', points: 100, category: 'INDIVIDUAL_CHOICE' },
        ], // = 800p (100+100+100+50+100+50+100+200)
    },
};

async function seedProject() {
    console.log('=== SKAPAR GYMNASIUM MED 27 KLASSER ===\n');

    // 1. Create or find default user
    const defaultEmail = 'admin@example.com';
    const defaultPassword = 'admin123';

    let user = await db.select()
        .from(users)
        .where(eq(users.email, defaultEmail))
        .limit(1);

    if (user.length === 0) {
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        const [newUser] = await db.insert(users).values({
            email: defaultEmail,
            name: 'Admin User',
            passwordHash,
        }).returning();
        user = [newUser];
        console.log('✅ Skapade användare:', defaultEmail);
    } else {
        console.log('✅ Hittade befintlig användare:', defaultEmail);
    }

    // 2. Create or find project
    const projectName = 'Gymnasium 27 Klasser';
    let existingProject = await db.select()
        .from(projects)
        .where(eq(projects.name, projectName))
        .limit(1);

    if (existingProject.length === 0) {
        const [newProject] = await db.insert(projects).values({
            userId: user[0].id,
            name: projectName,
            description: 'Stort gymnasium med 27 klasser - 3 program (TE, NA, SA) x 3 paralleller x 3 årskurser',
            earliestLessonStart: '08:00:00',
            latestLessonEnd: '17:00:00',
            defaultLessonDuration: 60,
            mentorTimePerWeek: 30,
            lunchDuration: 45,
            earliestLunchTime: '11:30:00',
            latestLunchTime: '13:30:00',
            shortestBreakBetweenLessons: 5,
            longestBreakBetweenLessons: 15,
        }).returning();
        existingProject = [newProject];
        console.log('✅ Skapade projekt:', projectName);
    } else {
        console.log('✅ Hittade befintligt projekt:', projectName);
    }

    PROJECT_ID = existingProject[0].id;
    console.log('   Projekt-ID:', PROJECT_ID);

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

    // Create teachers
    console.log('\n=== SKAPAR LÄRARE ===\n');
    const teachersData = [
        { name: 'Anna Andersson', email: 'anna.andersson@skola.se', subject: 'Matematik' },
        { name: 'Björn Berg', email: 'bjorn.berg@skola.se', subject: 'Fysik' },
        { name: 'Cecilia Carlsson', email: 'cecilia.carlsson@skola.se', subject: 'Kemi' },
        { name: 'David Dahl', email: 'david.dahl@skola.se', subject: 'Biologi' },
        { name: 'Erik Eriksson', email: 'erik.eriksson@skola.se', subject: 'Historia' },
        { name: 'Frida Fredriksson', email: 'frida.fredriksson@skola.se', subject: 'Samhällskunskap' },
        { name: 'Gustav Gustafsson', email: 'gustav.gustafsson@skola.se', subject: 'Svenska' },
        { name: 'Hanna Hansson', email: 'hanna.hansson@skola.se', subject: 'Engelska' },
        { name: 'Ingrid Ingvarsson', email: 'ingrid.ingvarsson@skola.se', subject: 'Geografi' },
        { name: 'Johan Johansson', email: 'johan.johansson@skola.se', subject: 'Religion' },
        { name: 'Karin Karlsson', email: 'karin.karlsson@skola.se', subject: 'Idrott' },
        { name: 'Lars Larsson', email: 'lars.larsson@skola.se', subject: 'Teknik' },
        { name: 'Maria Magnusson', email: 'maria.magnusson@skola.se', subject: 'Programmering' },
        { name: 'Nils Nilsson', email: 'nils.nilsson@skola.se', subject: 'Psykologi' },
        { name: 'Olof Olsson', email: 'olof.olsson@skola.se', subject: 'Filosofi' },
        { name: 'Petra Persson', email: 'petra.persson@skola.se', subject: 'Moderna språk' },
        { name: 'Rolf Robertsson', email: 'rolf.robertsson@skola.se', subject: 'Naturkunskap' },
        { name: 'Susanne Svensson', email: 'susanne.svensson@skola.se', subject: 'Matematik' },
        { name: 'Thomas Thörnqvist', email: 'thomas.thornqvist@skola.se', subject: 'Fysik' },
        { name: 'Ulrika Ullman', email: 'ulrika.ullman@skola.se', subject: 'Svenska' },
    ];

    const insertedTeachers = await db.insert(teachers).values(
        teachersData.map(t => ({
            projectId: PROJECT_ID,
            name: t.name,
            email: t.email,
            subject: t.subject,
        }))
    ).returning();

    console.log(`✅ Skapade ${insertedTeachers.length} lärare`);

    // Create rooms
    console.log('\n=== SKAPAR SALAR ===\n');

    // Delete existing rooms for this project
    await db.delete(rooms).where(eq(rooms.projectId, PROJECT_ID));

    const roomsData = [
        { roomNumber: 'A101', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'A102', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'A103', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'A104', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'A105', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'B101', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'B102', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'B103', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'B104', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'B105', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'C101', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'C102', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'C103', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'C104', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'C105', roomType: 'Klassrum', capacity: 32 },
        { roomNumber: 'Fysiksal 1', roomType: 'Laboratorium', capacity: 24 },
        { roomNumber: 'Fysiksal 2', roomType: 'Laboratorium', capacity: 24 },
        { roomNumber: 'Kemisal 1', roomType: 'Laboratorium', capacity: 24 },
        { roomNumber: 'Kemisal 2', roomType: 'Laboratorium', capacity: 24 },
        { roomNumber: 'Biologisal', roomType: 'Laboratorium', capacity: 24 },
        { roomNumber: 'Datorsal 1', roomType: 'Datorsal', capacity: 30 },
        { roomNumber: 'Datorsal 2', roomType: 'Datorsal', capacity: 30 },
        { roomNumber: 'Datorsal 3', roomType: 'Datorsal', capacity: 30 },
        { roomNumber: 'Idrottshall', roomType: 'Idrottshall', capacity: 60 },
        { roomNumber: 'Aula', roomType: 'Aula', capacity: 200 },
    ];

    const insertedRooms = await db.insert(rooms).values(
        roomsData.map(r => ({
            projectId: PROJECT_ID,
            roomNumber: r.roomNumber,
            roomType: r.roomType,
            capacity: r.capacity,
        }))
    ).returning();

    console.log(`✅ Skapade ${insertedRooms.length} salar`);

    // Assign mentors to classes
    console.log('\n=== TILLDELAR MENTORER ===\n');

    // Delete existing mentor assignments for this project's classes
    const classIdsForMentors = createdClasses.map(c => c.id);
    await db.delete(classMentors).where(inArray(classMentors.classId, classIdsForMentors));

    // Assign 1-2 mentors per class, round-robin from teacher list
    const mentorAssignments: { classId: string; teacherId: string; isPrimary: number }[] = [];
    let teacherIndex = 0;

    for (const cls of createdClasses) {
        // Primary mentor
        const primaryTeacher = insertedTeachers[teacherIndex % insertedTeachers.length];
        mentorAssignments.push({
            classId: cls.id,
            teacherId: primaryTeacher.id,
            isPrimary: 1,
        });

        // Some classes get a secondary mentor (every third class)
        if (cls.classCode.endsWith('a')) {
            const secondaryTeacher = insertedTeachers[(teacherIndex + 1) % insertedTeachers.length];
            mentorAssignments.push({
                classId: cls.id,
                teacherId: secondaryTeacher.id,
                isPrimary: 0,
            });
        }

        teacherIndex++;
    }

    await db.insert(classMentors).values(mentorAssignments);

    console.log(`✅ Tilldelade ${mentorAssignments.length} mentorskap till ${createdClasses.length} klasser`);

    // Print mentor summary
    const primaryMentorCount = mentorAssignments.filter(m => m.isPrimary === 1).length;
    const secondaryMentorCount = mentorAssignments.filter(m => m.isPrimary === 0).length;
    console.log(`   Huvudmentorer: ${primaryMentorCount}`);
    console.log(`   Biträdande mentorer: ${secondaryMentorCount}`);

    console.log('\n=== KLART! ===');
    console.log(`\nLogga in med: admin@example.com / admin123`);
    console.log(`Projekt: "${existingProject[0].name}"`);

    process.exit(0);
}

seedProject().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
