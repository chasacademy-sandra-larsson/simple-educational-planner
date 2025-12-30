// server/src/db/seed.ts
import 'dotenv/config';
import { db } from './index';
import { projects, projectClasses, teachers, rooms, users, classCurricula, courseInstances } from './schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...\n');

        // Create or find a default user for the seed project
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
            console.log('✅ Created default user:', defaultEmail);
        } else {
            console.log('✅ Found existing user:', defaultEmail);
        }

        // Create a new seed project
        const projectName = 'Gymnasieskola - Seed Projekt';
        const [project] = await db.insert(projects).values({
            userId: user[0].id,
            name: projectName,
            description: 'Seed-projekt med 9 klasser (3 teknik, 3 samhäll, 3 estetiska), 10 lärare och 12 salar',
            // Time settings - typical Swedish high school schedule
            earliestLessonStart: '08:00:00',
            latestLessonEnd: '17:00:00',
            defaultLessonDuration: 60, // 60 minutes
            mentorTimePerWeek: 30, // 30 minutes per week
            lunchDuration: 45, // 45 minutes
            earliestLunchTime: '11:30:00',
            latestLunchTime: '13:30:00',
            shortestBreakBetweenLessons: 5, // 5 minutes
            longestBreakBetweenLessons: 15, // 15 minutes
        }).returning();

        console.log('✅ Created project:', projectName);
        console.log('   Project ID:', project.id);

        // Create 10 teachers
        console.log('\n👨‍🏫 Creating teachers...');
        const teachersData = [
            { name: 'Anna Andersson', email: 'anna.andersson@skola.se', subject: 'Matematik' },
            { name: 'Björn Berg', email: 'bjorn.berg@skola.se', subject: 'Fysik' },
            { name: 'Cecilia Carlsson', email: 'cecilia.carlsson@skola.se', subject: 'Kemi' },
            { name: 'David Dahl', email: 'david.dahl@skola.se', subject: 'Biologi' },
            { name: 'Erik Eriksson', email: 'erik.eriksson@skola.se', subject: 'Historia' },
            { name: 'Frida Fredriksson', email: 'frida.fredriksson@skola.se', subject: 'Samhällskunskap' },
            { name: 'Gustav Gustafsson', email: 'gustav.gustafsson@skola.se', subject: 'Svenska' },
            { name: 'Hanna Hansson', email: 'hanna.hansson@skola.se', subject: 'Engelska' },
            { name: 'Ingrid Ingvarsson', email: 'ingrid.ingvarsson@skola.se', subject: 'Bild' },
            { name: 'Johan Johansson', email: 'johan.johansson@skola.se', subject: 'Musik' },
        ];

        const insertedTeachers = await db.insert(teachers).values(
            teachersData.map(t => ({
                projectId: project.id,
                name: t.name,
                email: t.email,
                subject: t.subject,
            }))
        ).returning();

        console.log(`✅ Created ${insertedTeachers.length} teachers`);

        // Create 12 rooms
        console.log('\n🏫 Creating rooms...');
        const roomsData = [
            { roomNumber: 'A101', roomType: 'Klassrum', capacity: 30 },
            { roomNumber: 'A102', roomType: 'Klassrum', capacity: 30 },
            { roomNumber: 'A103', roomType: 'Klassrum', capacity: 30 },
            { roomNumber: 'LAB1', roomType: 'Laboratorium', capacity: 24, allowedSubjects: ['fysik', 'kemi', 'biologi'] },
            { roomNumber: 'LAB2', roomType: 'Laboratorium', capacity: 24, allowedSubjects: ['fysik', 'kemi', 'biologi'] },
            { roomNumber: 'BIL1', roomType: 'Bildsal', capacity: 20, allowedSubjects: ['bild'] },
            { roomNumber: 'BIL2', roomType: 'Bildsal', capacity: 20, allowedSubjects: ['bild'] },
            { roomNumber: 'MUS1', roomType: 'Musiksal', capacity: 25, allowedSubjects: ['musik'] },
            { roomNumber: 'MUS2', roomType: 'Musiksal', capacity: 25, allowedSubjects: ['musik'] },
            { roomNumber: 'DATA1', roomType: 'Datorsal', capacity: 30 },
            { roomNumber: 'DATA2', roomType: 'Datorsal', capacity: 30 },
            { roomNumber: 'STUDIO', roomType: 'Studio', capacity: 15, allowedSubjects: ['bild', 'musik'] },
        ];

        const insertedRooms = await db.insert(rooms).values(
            roomsData.map(r => ({
                projectId: project.id,
                roomNumber: r.roomNumber,
                roomType: r.roomType,
                capacity: r.capacity,
                allowedSubjects: r.allowedSubjects || null,
            }))
        ).returning();

        console.log(`✅ Created ${insertedRooms.length} rooms`);

        // Create 9 classes (3 teknik, 3 samhäll, 3 estetiska)
        console.log('\n📚 Creating classes...');
        const classesData = [
            // Teknikklasser
            { classCode: 'TE26A', programCode: 'TE', programName: 'Teknikprogrammet', orientationCode: 'TEKTEK', orientationName: 'Teknik', startYear: 2026 },
            { classCode: 'TE26B', programCode: 'TE', programName: 'Teknikprogrammet', orientationCode: 'TEKTEK', orientationName: 'Teknik', startYear: 2026 },
            { classCode: 'TE26C', programCode: 'TE', programName: 'Teknikprogrammet', orientationCode: 'TEKTEK', orientationName: 'Teknik', startYear: 2026 },
            // Samhällsklasser
            { classCode: 'SA26A', programCode: 'SA', programName: 'Samhällsvetenskapsprogrammet', orientationCode: 'SAMH', orientationName: 'Samhällsvetenskap', startYear: 2026 },
            { classCode: 'SA26B', programCode: 'SA', programName: 'Samhällsvetenskapsprogrammet', orientationCode: 'SAMH', orientationName: 'Samhällsvetenskap', startYear: 2026 },
            { classCode: 'SA26C', programCode: 'SA', programName: 'Samhällsvetenskapsprogrammet', orientationCode: 'SAMH', orientationName: 'Samhällsvetenskap', startYear: 2026 },
            // Estetiska klasser
            { classCode: 'ES26A', programCode: 'ES', programName: 'Estetiska programmet', orientationCode: 'ESTB', orientationName: 'Bild och form', startYear: 2026 },
            { classCode: 'ES26B', programCode: 'ES', programName: 'Estetiska programmet', orientationCode: 'ESTM', orientationName: 'Musik', startYear: 2026 },
            { classCode: 'ES26C', programCode: 'ES', programName: 'Estetiska programmet', orientationCode: 'ESTB', orientationName: 'Bild och form', startYear: 2026 },
        ];

        const insertedClasses = await db.insert(projectClasses).values(
            classesData.map(c => ({
                projectId: project.id,
                classCode: c.classCode,
                programCode: c.programCode,
                programName: c.programName,
                orientationCode: c.orientationCode,
                orientationName: c.orientationName,
                startYear: c.startYear,
                graduationYear: c.startYear + 3,
            }))
        ).returning();

        console.log(`✅ Created ${insertedClasses.length} classes`);

        // Create curricula and course instances for each class
        console.log('\n📖 Creating curricula and courses...');
        
        // Teknikprogrammet kurser (typiska kurser)
        const teknikCourses = [
            // Grundläggande ämnen
            { courseCode: 'MATMAT01a', courseName: 'Matematik 1a', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'MATMAT02a', courseName: 'Matematik 2a', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'MATMAT03b', courseName: 'Matematik 3b', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'SVESVE01', courseName: 'Svenska 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'SVESVE02', courseName: 'Svenska 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'SVESVE03', courseName: 'Svenska 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'ENGENG05', courseName: 'Engelska 5', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'ENGENG06', courseName: 'Engelska 6', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'IDHIDH01', courseName: 'Idrott och hälsa 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            // Programgemensamma ämnen
            { courseCode: 'FYSFYS01', courseName: 'Fysik 1', points: 150, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'FYSFYS02', courseName: 'Fysik 2', points: 150, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'KEMKEM01', courseName: 'Kemi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'KEMKEM02', courseName: 'Kemi 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'BIOBIO01', courseName: 'Biologi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'TEKTEK01', courseName: 'Teknik 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'TEKTEK02', courseName: 'Teknik 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'GYMNASIEARBETE', courseName: 'Gymnasiearbete', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 3 },
            // Inriktningsämnen
            { courseCode: 'TEKTEK03', courseName: 'Teknik 3', points: 200, category: 'ORIENTATION', year: 3 },
            { courseCode: 'TEKTEK04', courseName: 'Teknik 4', points: 200, category: 'ORIENTATION', year: 3 },
            // Individuellt val
            { courseCode: 'INDIVIDUAL_CHOICE', courseName: 'Individuellt val', points: 200, category: 'INDIVIDUAL_CHOICE', year: 2 },
        ];

        // Samhällsvetenskapsprogrammet kurser
        const samhällCourses = [
            // Grundläggande ämnen
            { courseCode: 'MATMAT01a', courseName: 'Matematik 1a', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'MATMAT02a', courseName: 'Matematik 2a', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'SVESVE01', courseName: 'Svenska 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'SVESVE02', courseName: 'Svenska 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'SVESVE03', courseName: 'Svenska 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'ENGENG05', courseName: 'Engelska 5', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'ENGENG06', courseName: 'Engelska 6', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'IDHIDH01', courseName: 'Idrott och hälsa 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            // Programgemensamma ämnen
            { courseCode: 'HISHIS01', courseName: 'Historia 1a1', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'HISHIS02', courseName: 'Historia 1a2', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'HISHIS03', courseName: 'Historia 1b', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'SAMSAM01', courseName: 'Samhällskunskap 1b', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'SAMSAM02', courseName: 'Samhällskunskap 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'GEOGEO01', courseName: 'Geografi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'PSYPSY01', courseName: 'Psykologi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'GYMNASIEARBETE', courseName: 'Gymnasiearbete', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 3 },
            // Inriktningsämnen
            { courseCode: 'SAMSAM03', courseName: 'Samhällskunskap 3', points: 200, category: 'ORIENTATION', year: 3 },
            { courseCode: 'PSYPSY02', courseName: 'Psykologi 2', points: 200, category: 'ORIENTATION', year: 3 },
            // Individuellt val
            { courseCode: 'INDIVIDUAL_CHOICE', courseName: 'Individuellt val', points: 200, category: 'INDIVIDUAL_CHOICE', year: 2 },
        ];

        // Estetiska programmet kurser
        const estetiskaCourses = [
            // Grundläggande ämnen
            { courseCode: 'MATMAT01a', courseName: 'Matematik 1a', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'MATMAT02a', courseName: 'Matematik 2a', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'SVESVE01', courseName: 'Svenska 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'SVESVE02', courseName: 'Svenska 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'SVESVE03', courseName: 'Svenska 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'ENGENG05', courseName: 'Engelska 5', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'ENGENG06', courseName: 'Engelska 6', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'IDHIDH01', courseName: 'Idrott och hälsa 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            // Programgemensamma ämnen
            { courseCode: 'BILBIL01', courseName: 'Bild 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'BILBIL02', courseName: 'Bild 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'MUSMUS01', courseName: 'Musik 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'MUSMUS02', courseName: 'Musik 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'HISHIS01', courseName: 'Historia 1a1', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'HISHIS02', courseName: 'Historia 1a2', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'GYMNASIEARBETE', courseName: 'Gymnasiearbete', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 3 },
            // Inriktningsämnen (Bild och form)
            { courseCode: 'BILBIL03', courseName: 'Bild 3', points: 200, category: 'ORIENTATION', year: 3 },
            { courseCode: 'BILBIL04', courseName: 'Bild 4', points: 200, category: 'ORIENTATION', year: 3 },
            // Inriktningsämnen (Musik)
            { courseCode: 'MUSMUS03', courseName: 'Musik 3', points: 200, category: 'ORIENTATION', year: 3 },
            { courseCode: 'MUSMUS04', courseName: 'Musik 4', points: 200, category: 'ORIENTATION', year: 3 },
            // Individuellt val
            { courseCode: 'INDIVIDUAL_CHOICE', courseName: 'Individuellt val', points: 200, category: 'INDIVIDUAL_CHOICE', year: 2 },
        ];

        // Create curricula and courses for each class
        for (const cls of insertedClasses) {
            // Determine which courses to use based on program
            let coursesToUse: typeof teknikCourses;
            if (cls.programCode === 'TE') {
                coursesToUse = teknikCourses;
            } else if (cls.programCode === 'SA') {
                coursesToUse = samhällCourses;
            } else {
                coursesToUse = estetiskaCourses;
            }

            // Calculate total points
            const totalPoints = coursesToUse.reduce((sum, c) => sum + c.points, 0);
            const isValid = totalPoints === 2500 ? 1 : 0;

            // Create curriculum
            const [curriculum] = await db.insert(classCurricula).values({
                classId: cls.id,
                totalPoints,
                isValid,
                status: 'draft',
                version: 1,
            }).returning();

            // Create course instances
            await db.insert(courseInstances).values(
                coursesToUse.map(course => ({
                    curriculumId: curriculum.id,
                    classId: cls.id,
                    courseCode: course.courseCode,
                    courseName: course.courseName,
                    points: course.points,
                    category: course.category as any,
                    year: course.year,
                    terms: ['term1', 'term2'] as any, // Default terms
                    teacherId: null,
                    roomId: null,
                    lessonDuration: null,
                }))
            );

            console.log(`✅ Created curriculum for ${cls.classCode} (${coursesToUse.length} courses, ${totalPoints} points)`);
        }

        console.log(`\n✨ Seeding complete!`);
        console.log(`   - Project: ${project.name}`);
        console.log(`   - Classes: ${insertedClasses.length}`);
        console.log(`   - Teachers: ${insertedTeachers.length}`);
        console.log(`   - Rooms: ${insertedRooms.length}`);
        console.log(`   - User: ${user[0].email}`);
        console.log(`\n📝 Login credentials:`);
        console.log(`   Email: ${defaultEmail}`);
        console.log(`   Password: ${defaultPassword}`);
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

seedDatabase();