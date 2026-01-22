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

        // Delete existing seed project if it exists, then create new
        const projectName = 'Gymnasieskola - Seed Projekt';
        const existingProjects = await db.select()
            .from(projects)
            .where(and(
                eq(projects.userId, user[0].id),
                eq(projects.name, projectName)
            ));

        if (existingProjects.length > 0) {
            for (const p of existingProjects) {
                await db.delete(projects).where(eq(projects.id, p.id));
            }
            console.log('🗑️  Deleted existing seed project(s)');
        }

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
        
        // ===========================================
        // TEKNIKPROGRAMMET (2500p)
        // År 1: 850p, År 2: 850p, År 3: 800p
        // ===========================================
        const teknikCourses = [
            // År 1: 850p (mål: 400 HT + 450 VT)
            { courseCode: 'MATMAT01c', courseName: 'Matematik 1c', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'SVESVE01', courseName: 'Svenska 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'ENGENG05', courseName: 'Engelska 5', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'IDHIDH01', courseName: 'Idrott och hälsa 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'FYSFYS01a', courseName: 'Fysik 1a', points: 150, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'KEMKEM01', courseName: 'Kemi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'TEKTEK01', courseName: 'Teknik 1', points: 150, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'PRRPRR01', courseName: 'Programmering 1', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            // År 2: 850p (mål: 400 HT + 450 VT)
            { courseCode: 'MATMAT02c', courseName: 'Matematik 2c', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'SVESVE02', courseName: 'Svenska 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'ENGENG06', courseName: 'Engelska 6', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'HISHIS01b', courseName: 'Historia 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'FYSFYS01b', courseName: 'Fysik 1b1', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'KEMKEM02', courseName: 'Kemi 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'TEKTEK02', courseName: 'Teknik 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'PRRPRR02', courseName: 'Programmering 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'RELREL01', courseName: 'Religionskunskap 1', points: 50, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'SAMSAM01b', courseName: 'Samhällskunskap 1b', points: 50, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            // År 3: 800p (mål: 400 HT + 400 VT, inkl. gymnasiearbete + individuellt val)
            { courseCode: 'MATMAT03c', courseName: 'Matematik 3c', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'SVESVE03', courseName: 'Svenska 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'FYSFYS02', courseName: 'Fysik 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 3 },
            { courseCode: 'TEKTSP01', courseName: 'Teknik - Loss specialisering', points: 100, category: 'ORIENTATION', year: 3 },
            { courseCode: 'WEBWEB02', courseName: 'Webbutveckling 2', points: 100, category: 'ORIENTATION', year: 3 },
            { courseCode: 'GYMNASIEARBETE', courseName: 'Gymnasiearbete', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 3 },
            { courseCode: 'INDIVIDUAL_CHOICE_1', courseName: 'Individuellt val 1', points: 100, category: 'INDIVIDUAL_CHOICE', year: 3 },
            { courseCode: 'INDIVIDUAL_CHOICE_2', courseName: 'Individuellt val 2', points: 100, category: 'INDIVIDUAL_CHOICE', year: 3 },
        ];

        // ===========================================
        // SAMHÄLLSVETENSKAPSPROGRAMMET (2500p)
        // År 1: 850p, År 2: 850p, År 3: 800p
        // ===========================================
        const samhällCourses = [
            // År 1: 850p (mål: 400 HT + 450 VT)
            { courseCode: 'MATMAT01b', courseName: 'Matematik 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'SVESVE01', courseName: 'Svenska 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'ENGENG05', courseName: 'Engelska 5', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'IDHIDH01', courseName: 'Idrott och hälsa 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'HISHIS01a1', courseName: 'Historia 1a1', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'HISHIS01a2', courseName: 'Historia 1a2', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'SAMSAM01b', courseName: 'Samhällskunskap 1b', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'RELREL01', courseName: 'Religionskunskap 1', points: 50, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'NAKNAF01b', courseName: 'Naturkunskap 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'MODSPR01', courseName: 'Moderna språk 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            // År 2: 850p (mål: 400 HT + 450 VT)
            { courseCode: 'MATMAT02b', courseName: 'Matematik 2b', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'SVESVE02', courseName: 'Svenska 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'ENGENG06', courseName: 'Engelska 6', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'HISHIS02a', courseName: 'Historia 2a', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'SAMSAM02', courseName: 'Samhällskunskap 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'PSYPSY01', courseName: 'Psykologi 1', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'GEOGEO01', courseName: 'Geografi 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'MODSPR02', courseName: 'Moderna språk 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'RELREL02', courseName: 'Religionskunskap 2', points: 50, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'NAKNAK02', courseName: 'Naturkunskap 2', points: 50, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            // År 3: 800p (mål: 400 HT + 400 VT, inkl. gymnasiearbete + individuellt val)
            { courseCode: 'SVESVE03', courseName: 'Svenska 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'SAMSAM03', courseName: 'Samhällskunskap 3', points: 100, category: 'ORIENTATION', year: 3 },
            { courseCode: 'PSYPSY02a', courseName: 'Psykologi 2a', points: 50, category: 'ORIENTATION', year: 3 },
            { courseCode: 'HISHIS02b', courseName: 'Historia 2b - Loss specialisering', points: 100, category: 'ORIENTATION', year: 3 },
            { courseCode: 'FILFIL00S', courseName: 'Filosofi', points: 50, category: 'ORIENTATION', year: 3 },
            { courseCode: 'MODSPR03', courseName: 'Moderna språk 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'GYMNASIEARBETE', courseName: 'Gymnasiearbete', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 3 },
            { courseCode: 'INDIVIDUAL_CHOICE_1', courseName: 'Individuellt val 1', points: 100, category: 'INDIVIDUAL_CHOICE', year: 3 },
            { courseCode: 'INDIVIDUAL_CHOICE_2', courseName: 'Individuellt val 2', points: 100, category: 'INDIVIDUAL_CHOICE', year: 3 },
        ];

        // ===========================================
        // ESTETISKA PROGRAMMET - MUSIK (2500p)
        // År 1: 850p, År 2: 850p, År 3: 800p
        // ===========================================
        const estetiskaCourses = [
            // År 1: 850p (mål: 400 HT + 450 VT)
            { courseCode: 'MATMAT01b', courseName: 'Matematik 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'SVESVE01', courseName: 'Svenska 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'ENGENG05', courseName: 'Engelska 5', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'IDHIDH01', courseName: 'Idrott och hälsa 1', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            { courseCode: 'ESTEST01', courseName: 'Estetisk kommunikation 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'ENSENS01', courseName: 'Ensemble 1', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 1 },
            { courseCode: 'MUSINS01', courseName: 'Instrument eller sång 1', points: 100, category: 'ORIENTATION', year: 1 },
            { courseCode: 'GEHGEH01', courseName: 'Gehörs- och musiklära 1', points: 100, category: 'ORIENTATION', year: 1 },
            { courseCode: 'RELREL01', courseName: 'Religionskunskap 1', points: 50, category: 'FOUNDATIONAL_SUBJECTS', year: 1 },
            // År 2: 850p (mål: 400 HT + 450 VT)
            { courseCode: 'SVESVE02', courseName: 'Svenska 2', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'ENGENG06', courseName: 'Engelska 6', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'HISHIS01b', courseName: 'Historia 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'SAMSAM01b', courseName: 'Samhällskunskap 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 2 },
            { courseCode: 'ESTEST02', courseName: 'Estetisk kommunikation 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'ENSENS02', courseName: 'Ensemble 2', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            { courseCode: 'MUSINS02', courseName: 'Instrument eller sång 2', points: 100, category: 'ORIENTATION', year: 2 },
            { courseCode: 'GEHGEH02', courseName: 'Gehörs- och musiklära 2', points: 100, category: 'ORIENTATION', year: 2 },
            { courseCode: 'KOSKOS01', courseName: 'Konst och kultur 1', points: 50, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 2 },
            // År 3: 800p (mål: 400 HT + 400 VT, inkl. gymnasiearbete + individuellt val)
            { courseCode: 'SVESVE03', courseName: 'Svenska 3', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'NAKNAF01b', courseName: 'Naturkunskap 1b', points: 100, category: 'FOUNDATIONAL_SUBJECTS', year: 3 },
            { courseCode: 'ESTEST03', courseName: 'Estetisk kommunikation 3', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 3 },
            { courseCode: 'MUSINS03', courseName: 'Instrument eller sång 3', points: 100, category: 'ORIENTATION', year: 3 },
            { courseCode: 'MUSSPE00S', courseName: 'Musik - Loss specialisering', points: 100, category: 'ORIENTATION', year: 3 },
            { courseCode: 'GYMNASIEARBETE', courseName: 'Gymnasiearbete', points: 100, category: 'PROGRAMME_SPECIFIC_SUBJECTS', year: 3 },
            { courseCode: 'INDIVIDUAL_CHOICE_1', courseName: 'Individuellt val 1', points: 100, category: 'INDIVIDUAL_CHOICE', year: 3 },
            { courseCode: 'INDIVIDUAL_CHOICE_2', courseName: 'Individuellt val 2', points: 100, category: 'INDIVIDUAL_CHOICE', year: 3 },
        ];

        // Helper function to distribute courses across terms
        // Target: 400p fall terms (HT), 450p spring terms (VT)
        // Exception: term5 and term6 both target 400p (gymnasiearbete i term6 gör att VT år 3 redan har 100p fast)
        function distributeCourses(courses: typeof teknikCourses): Array<typeof teknikCourses[0] & { terms: string[] }> {
            // Pre-account for fixed courses in year 3:
            // - GYMNASIEARBETE: 100p in term6
            // - INDIVIDUAL_CHOICE_1: 100p in term5
            // - INDIVIDUAL_CHOICE_2: 100p in term6
            // This means term5 starts with 100p, term6 starts with 200p
            const termPoints: Record<string, number> = {
                term1: 0, term2: 0, term3: 0, term4: 0, term5: 100, term6: 200
            };

            // Targets: 400p for fall (HT), 450p for spring (VT)
            // Exception: term6 target is 400p (since VT år 3 already has gymnasiearbete)
            const getTarget = (term: string) => {
                if (term === 'term6') return 400; // VT år 3 - lower target due to gymnasiearbete
                if (['term1', 'term3', 'term5'].includes(term)) return 400; // HT
                return 450; // VT (term2, term4)
            };

            return courses.map(course => {
                let terms: string[];

                // Special handling for fixed courses (already counted in termPoints)
                if (course.courseCode === 'GYMNASIEARBETE') {
                    terms = ['term6'];
                    return { ...course, terms }; // Don't add to counter again
                } else if (course.courseCode === 'INDIVIDUAL_CHOICE_1') {
                    terms = ['term5'];
                    return { ...course, terms }; // Don't add to counter again
                } else if (course.courseCode === 'INDIVIDUAL_CHOICE_2') {
                    terms = ['term6'];
                    return { ...course, terms }; // Don't add to counter again
                } else {
                    // Determine which terms this course can be assigned to based on year
                    const yearTerms = course.year === 1
                        ? ['term1', 'term2']
                        : course.year === 2
                            ? ['term3', 'term4']
                            : ['term5', 'term6'];

                    const [ht, vt] = yearTerms;
                    const htRoom = getTarget(ht) - termPoints[ht];
                    const vtRoom = getTarget(vt) - termPoints[vt];

                    // Decision logic:
                    // 1. If course fits in both, prefer VT (spring) since it has higher target (450 vs 400)
                    //    Unless HT has significantly more room (>=50p more)
                    // 2. If only fits in one, use that one
                    // 3. If doesn't fit in either, split across both
                    if (course.points <= htRoom && course.points <= vtRoom) {
                        // Both have room - prefer VT unless HT has much more room
                        if (htRoom - vtRoom >= 50) {
                            terms = [ht];
                        } else {
                            terms = [vt];
                        }
                    } else if (course.points <= htRoom) {
                        terms = [ht];
                    } else if (course.points <= vtRoom) {
                        terms = [vt];
                    } else {
                        // Neither term has enough room - split across both
                        terms = yearTerms;
                    }
                }

                // Update term point counters
                const pointsPerTerm = course.points / terms.length;
                terms.forEach(t => termPoints[t] += pointsPerTerm);

                return { ...course, terms };
            });
        }

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

            // Distribute courses evenly across terms
            const distributedCourses = distributeCourses(coursesToUse);

            // Create course instances
            await db.insert(courseInstances).values(
                distributedCourses.map(course => ({
                    curriculumId: curriculum.id,
                    classId: cls.id,
                    courseCode: course.courseCode,
                    courseName: course.courseName,
                    points: course.points,
                    category: course.category as any,
                    year: course.year,
                    terms: course.terms as any,
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