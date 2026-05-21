/**
 * Engångsscript: Tar bort befintliga lärare och skapar en ny optimal lärarkår med
 * realistiska ämneskombinationer (2–3 behörigheter per lärare). Tilldelar kurser
 * och mentorer med optimeringsloop för jämn fördelning.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projects, projectClasses, courseInstances, teachers, classMentors, teacherServiceDistributions } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const ACADEMIC_YEAR = 2026;
const TARGET_POINTS = 600;

function getClassYearLevel(startYear: number, academicYear: number): number {
    return academicYear - startYear + 1;
}

// Mappa kurskoder till ämnen
function getCourseSubject(courseCode: string, courseName: string): string {
    const code = courseCode.toUpperCase();
    const name = courseName.toLowerCase();

    if (code.startsWith('SVE') || name.includes('svenska')) return 'Svenska';
    if (code.startsWith('ENG') || name.includes('engelska')) return 'Engelska';
    if (code.startsWith('MAT') || name.includes('matematik')) return 'Matematik';
    if (code.startsWith('FYS') || name.includes('fysik')) return 'Fysik';
    if (code.startsWith('KEM') || name.includes('kemi')) return 'Kemi';
    if (code.startsWith('BIO') || name.includes('biologi')) return 'Biologi';
    if (code.startsWith('HIS') || name.includes('historia')) return 'Historia';
    if (code.startsWith('SAM') || name.includes('samhäll')) return 'Samhällskunskap';
    if (code.startsWith('REL') || name.includes('religion')) return 'Religion';
    if (code.startsWith('IDH') || name.includes('idrott') || name.includes('hälsa')) return 'Idrott';
    if (code.startsWith('TEK') || name.includes('teknik')) return 'Teknik';
    if (code.startsWith('PRR') || name.includes('programmering')) return 'Programmering';
    if (code.startsWith('GEO') || name.includes('geografi')) return 'Geografi';
    if (code.startsWith('PSY') || name.includes('psykologi')) return 'Psykologi';
    if (code.startsWith('FIL') || name.includes('filosofi')) return 'Filosofi';
    if (code.startsWith('MOD') || name.includes('moderna språk')) return 'Moderna språk';
    if (code.startsWith('NAK') || name.includes('naturkunskap') || name.includes('naturvetenskaplig')) return 'Naturkunskap';
    if (code.startsWith('EXA') || name.includes('gymnasiearbete')) return 'Gymnasiearbete';
    if (code.startsWith('IND') || name.includes('individuellt val')) return 'Individuellt val';

    return 'Övrigt';
}

// Realistiska ämneskombinationer för gymnasielärare
// Totalt 39 lärare för att matcha 23 400p / 600p = 39 heltidstjänster
const TEACHER_PROFILES = [
    // Matematik/Naturvetenskap (Ma+Fy behöver täcka 3300+1800 = 5100p → 8-9 lärare)
    { subjects: ['Matematik', 'Fysik'], count: 5 },
    { subjects: ['Matematik', 'Programmering'], count: 2 },
    { subjects: ['Fysik', 'Teknik'], count: 2 },
    { subjects: ['Kemi', 'Biologi', 'Naturkunskap'], count: 3 },
    { subjects: ['Biologi', 'Naturkunskap', 'Geografi'], count: 1 },

    // Språk (Sv 2700p, En 2700p, Mo 900p → behöver ~10 lärare)
    { subjects: ['Svenska', 'Historia'], count: 3 },
    { subjects: ['Svenska', 'Religion', 'Filosofi'], count: 2 },
    { subjects: ['Engelska', 'Moderna språk'], count: 5 },

    // Samhällsvetenskap (Sam 2400p, Hi 1500p, Geo 450p, Rel 600p, Psy 300p → ~8 lärare)
    { subjects: ['Samhällskunskap', 'Historia', 'Geografi'], count: 3 },
    { subjects: ['Samhällskunskap', 'Religion', 'Psykologi'], count: 2 },
    { subjects: ['Historia', 'Religion'], count: 1 },

    // Teknik/Praktiska (Te 1650p, Pr 600p, Id 900p → ~5 lärare)
    { subjects: ['Teknik', 'Programmering', 'Matematik'], count: 3 },
    { subjects: ['Idrott'], count: 2 },

    // Handledning (Ga 300p, Iv 600p → ~2 lärare, kan undervisa andra ämnen också)
    { subjects: ['Gymnasiearbete', 'Individuellt val', 'Teknik'], count: 2 },
    { subjects: ['Gymnasiearbete', 'Individuellt val', 'Samhällskunskap'], count: 2 },
    { subjects: ['Gymnasiearbete', 'Individuellt val', 'Naturkunskap'], count: 1 },
];

const FIRST_NAMES = [
    'Anna', 'Erik', 'Maria', 'Johan', 'Emma', 'Anders', 'Sara', 'Magnus',
    'Karin', 'Peter', 'Linda', 'Lars', 'Eva', 'Mikael', 'Sofia', 'Henrik',
    'Malin', 'Fredrik', 'Lena', 'Jonas', 'Annika', 'Daniel', 'Kristina', 'Niklas',
    'Ingrid', 'Björn', 'Helena', 'Stefan', 'Elin', 'Thomas', 'Cecilia', 'Martin',
    'Louise', 'Per', 'Jenny', 'David'
];

const LAST_NAMES = [
    'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson',
    'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson'
];

function generateTeacherName(index: number): string {
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    return `${firstName} ${lastName}`;
}

function generateEmail(name: string): string {
    return name.toLowerCase()
        .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
        .replace(' ', '.') + '@skola.se';
}

// Kontrollera om en lärare kan undervisa en kurs
function teacherCanTeach(teacherSubjects: string[], courseSubject: string): boolean {
    return teacherSubjects.includes(courseSubject);
}

async function main() {
    console.log('=== SKAPAR OPTIMAL LÄRARKÅR MED KOMBINERADE BEHÖRIGHETER ===\n');

    // 1. Hämta projektet
    const [project] = await db.select()
        .from(projects)
        .where(eq(projects.name, 'Gymnasium 27 Klasser'))
        .limit(1);

    if (!project) {
        console.error('❌ Projektet hittades inte!');
        process.exit(1);
    }
    console.log(`✅ Projekt: ${project.name}\n`);

    // 2. Hämta aktiva klasser och kurser
    const allClasses = await db.select()
        .from(projectClasses)
        .where(eq(projectClasses.projectId, project.id));

    const activeClasses = allClasses.filter(cls => {
        const yearLevel = getClassYearLevel(cls.startYear, ACADEMIC_YEAR);
        return yearLevel >= 1 && yearLevel <= 3;
    });

    const classIds = activeClasses.map(c => c.id);
    const allCourses = await db.select()
        .from(courseInstances)
        .where(inArray(courseInstances.classId, classIds));

    const relevantCourses = allCourses.filter(course => {
        const classItem = activeClasses.find(c => c.id === course.classId);
        if (!classItem) return false;
        const classYearLevel = getClassYearLevel(classItem.startYear, ACADEMIC_YEAR);
        return course.year === classYearLevel;
    });

    // 3. Analysera ämnesbehov
    const subjectPoints: Map<string, number> = new Map();
    const subjectCourses: Map<string, typeof relevantCourses> = new Map();

    relevantCourses.forEach(course => {
        const subject = getCourseSubject(course.courseCode, course.courseName);
        subjectPoints.set(subject, (subjectPoints.get(subject) || 0) + course.points);

        if (!subjectCourses.has(subject)) {
            subjectCourses.set(subject, []);
        }
        subjectCourses.get(subject)!.push(course);
    });

    console.log('=== ÄMNESBEHOV ===\n');
    const sortedSubjects = [...subjectPoints.entries()].sort((a, b) => b[1] - a[1]);
    sortedSubjects.forEach(([subject, points]) => {
        const courses = subjectCourses.get(subject)!.length;
        console.log(`${subject.padEnd(20)} ${String(points).padStart(5)}p  (${courses} kurser)`);
    });

    const totalPoints = relevantCourses.reduce((sum, c) => sum + c.points, 0);
    console.log(`${'TOTALT'.padEnd(20)} ${String(totalPoints).padStart(5)}p  (${relevantCourses.length} kurser)`);
    console.log(`\nBehov: ${Math.ceil(totalPoints / TARGET_POINTS)} heltidstjänster\n`);

    // 4. Ta bort befintliga lärare
    const existingTeachers = await db.select()
        .from(teachers)
        .where(eq(teachers.projectId, project.id));

    if (existingTeachers.length > 0) {
        const teacherIds = existingTeachers.map(t => t.id);
        await db.delete(classMentors).where(inArray(classMentors.teacherId, teacherIds));
        await db.delete(teacherServiceDistributions).where(inArray(teacherServiceDistributions.teacherId, teacherIds));
        await db.update(courseInstances).set({ teacherId: null }).where(inArray(courseInstances.teacherId, teacherIds));
        await db.delete(teachers).where(inArray(teachers.id, teacherIds));
        console.log(`✅ Tog bort ${existingTeachers.length} befintliga lärare\n`);
    }

    // 5. Skapa nya lärare med kombinerade behörigheter
    console.log('=== SKAPAR LÄRARE MED KOMBINERADE BEHÖRIGHETER ===\n');

    interface TeacherData {
        name: string;
        email: string;
        subjects: string[];
        subjectDisplay: string;
    }

    const newTeachers: TeacherData[] = [];
    let teacherIndex = 0;

    for (const profile of TEACHER_PROFILES) {
        for (let i = 0; i < profile.count; i++) {
            const name = generateTeacherName(teacherIndex);
            newTeachers.push({
                name,
                email: generateEmail(name),
                subjects: profile.subjects,
                subjectDisplay: profile.subjects.join(', '),
            });
            teacherIndex++;
        }
    }

    // Infoga i databasen
    const insertedTeachers = await db.insert(teachers).values(
        newTeachers.map(t => ({
            projectId: project.id,
            name: t.name,
            email: t.email,
            subject: t.subjectDisplay, // Lagra som kommaseparerad sträng
        }))
    ).returning();

    console.log(`✅ Skapade ${insertedTeachers.length} lärare\n`);

    // Visa lärare
    newTeachers.forEach((t, i) => {
        console.log(`${t.name.padEnd(22)} ${t.subjectDisplay}`);
    });

    // 6. Skapa allokeringskarta
    interface TeacherAllocation {
        teacher: typeof insertedTeachers[0];
        subjects: string[];
        points: number;
        courses: typeof relevantCourses;
    }

    const teacherAllocations: Map<string, TeacherAllocation> = new Map();
    insertedTeachers.forEach((t, i) => {
        teacherAllocations.set(t.id, {
            teacher: t,
            subjects: newTeachers[i].subjects,
            points: 0,
            courses: [],
        });
    });

    // 7. Tilldela kurser - optimal fördelning
    console.log('\n=== TILLDELAR KURSER ===\n');

    const assignments: { courseId: string; teacherId: string }[] = [];

    // Samla alla kurser med ämnesinfo
    const allCoursesToAssign = relevantCourses.map(course => ({
        course,
        subject: getCourseSubject(course.courseCode, course.courseName),
    }));

    // Sortera kurser efter poäng (störst först)
    allCoursesToAssign.sort((a, b) => b.course.points - a.course.points);

    // Tilldela varje kurs
    for (const { course, subject } of allCoursesToAssign) {
        // Hitta alla lärare som kan undervisa detta ämne
        const qualifiedTeachers = [...teacherAllocations.values()]
            .filter(a => teacherCanTeach(a.subjects, subject))
            .sort((a, b) => a.points - b.points);

        let selectedTeacher: TeacherAllocation | null = null;

        // Prioritet 1: Kvalificerad lärare som blir <= 600p
        for (const teacher of qualifiedTeachers) {
            if (teacher.points + course.points <= TARGET_POINTS) {
                selectedTeacher = teacher;
                break;
            }
        }

        // Prioritet 2: Kvalificerad lärare med minst poäng
        if (!selectedTeacher && qualifiedTeachers.length > 0) {
            selectedTeacher = qualifiedTeachers[0];
        }

        // Prioritet 3: Vilken lärare som helst som blir <= 600p
        if (!selectedTeacher) {
            const allTeachersSorted = [...teacherAllocations.values()].sort((a, b) => a.points - b.points);
            for (const teacher of allTeachersSorted) {
                if (teacher.points + course.points <= TARGET_POINTS) {
                    selectedTeacher = teacher;
                    break;
                }
            }
        }

        // Prioritet 4: Läraren med minst poäng
        if (!selectedTeacher) {
            const allTeachersSorted = [...teacherAllocations.values()].sort((a, b) => a.points - b.points);
            selectedTeacher = allTeachersSorted[0];
        }

        // Tilldela
        selectedTeacher.points += course.points;
        selectedTeacher.courses.push(course);
        assignments.push({
            courseId: course.id,
            teacherId: selectedTeacher.teacher.id,
        });
    }

    // 8. Finjustera fördelningen
    console.log('Optimerar fördelning...');

    let improved = true;
    let iterations = 0;
    const MAX_ITERATIONS = 1000;

    while (improved && iterations < MAX_ITERATIONS) {
        improved = false;
        iterations++;

        const sortedAllocations = [...teacherAllocations.values()].sort((a, b) => b.points - a.points);
        const maxPoints = sortedAllocations[0].points;
        const minPoints = sortedAllocations[sortedAllocations.length - 1].points;

        if (maxPoints - minPoints <= 50) break;

        // Försök flytta kurser
        for (const overloaded of sortedAllocations) {
            if (overloaded.points <= TARGET_POINTS) continue;

            for (const course of [...overloaded.courses]) {
                const courseSubject = getCourseSubject(course.courseCode, course.courseName);

                for (const underloaded of [...sortedAllocations].reverse()) {
                    if (underloaded.teacher.id === overloaded.teacher.id) continue;
                    if (underloaded.points >= overloaded.points) continue;

                    // Kontrollera att mottagaren kan undervisa ämnet eller har utrymme
                    const canTeach = teacherCanTeach(underloaded.subjects, courseSubject);
                    const hasRoom = underloaded.points + course.points <= TARGET_POINTS;

                    if (canTeach || hasRoom) {
                        const newOverloadedPoints = overloaded.points - course.points;
                        const newUnderloadedPoints = underloaded.points + course.points;
                        const oldDiff = Math.abs(overloaded.points - underloaded.points);
                        const newDiff = Math.abs(newOverloadedPoints - newUnderloadedPoints);

                        if (newDiff < oldDiff) {
                            overloaded.courses = overloaded.courses.filter(c => c.id !== course.id);
                            overloaded.points -= course.points;
                            underloaded.courses.push(course);
                            underloaded.points += course.points;

                            const idx = assignments.findIndex(a => a.courseId === course.id);
                            if (idx >= 0) {
                                assignments[idx].teacherId = underloaded.teacher.id;
                            }

                            improved = true;
                            break;
                        }
                    }
                }
                if (improved) break;
            }
            if (improved) break;
        }
    }

    console.log(`Optimering klar efter ${iterations} iterationer\n`);

    // 9. Uppdatera databasen
    for (const assignment of assignments) {
        await db.update(courseInstances)
            .set({ teacherId: assignment.teacherId })
            .where(eq(courseInstances.id, assignment.courseId));
    }

    console.log(`✅ Tilldelade ${assignments.length} kurser\n`);

    // 10. Visa fördelning
    console.log('=== TJÄNSTEFÖRDELNING ===\n');

    const sortedAllocations = [...teacherAllocations.values()].sort((a, b) => b.points - a.points);

    let at100 = 0, over100 = 0, under80 = 0;

    sortedAllocations.forEach(alloc => {
        const pct = Math.round((alloc.points / TARGET_POINTS) * 100);
        const bar = '█'.repeat(Math.min(Math.floor(pct / 10), 10)) + '░'.repeat(Math.max(10 - Math.floor(pct / 10), 0));

        if (pct >= 95 && pct <= 105) at100++;
        if (pct > 105) over100++;
        if (pct < 80 && alloc.points > 0) under80++;

        // Visa vilka ämnen läraren faktiskt undervisar
        const taughtSubjects = new Set(alloc.courses.map(c => getCourseSubject(c.courseCode, c.courseName)));
        const subjectsStr = [...taughtSubjects].join(', ');

        console.log(
            `${alloc.teacher.name.padEnd(22)} ${String(alloc.points).padStart(4)}p ${bar} ${String(pct).padStart(3)}%  [${subjectsStr}]`
        );
    });

    console.log('\n--- Sammanfattning ---');
    console.log(`✅ Lärare vid ~100% (95-105%): ${at100}`);
    console.log(`🔴 Över 105%: ${over100}`);
    console.log(`⚪ Under 80%: ${under80}`);
    console.log(`👥 Totalt antal lärare: ${insertedTeachers.length}`);

    // 11. Tilldela mentorer
    console.log('\n=== TILLDELAR MENTORER ===\n');

    const classGroups: Map<string, typeof activeClasses> = new Map();

    activeClasses.forEach(cls => {
        const match = cls.classCode.match(/^([A-Z]+)\d+([a-z])$/);
        if (match) {
            const [, program, parallel] = match;
            const groupKey = `${program}-${parallel}`;
            if (!classGroups.has(groupKey)) {
                classGroups.set(groupKey, []);
            }
            classGroups.get(groupKey)!.push(cls);
        }
    });

    const mentorAssignments: { classId: string; teacherId: string }[] = [];
    const usedMentorIds = new Set<string>();

    for (const [groupKey, groupClasses] of classGroups) {
        const teacherCourseCount: Map<string, number> = new Map();

        for (const cls of groupClasses) {
            const classAssignments = assignments.filter(a => {
                const course = relevantCourses.find(c => c.id === a.courseId);
                return course?.classId === cls.id;
            });

            classAssignments.forEach(a => {
                const count = teacherCourseCount.get(a.teacherId) || 0;
                teacherCourseCount.set(a.teacherId, count + 1);
            });
        }

        let selectedMentor: string | null = null;
        let maxCourses = 0;

        for (const [teacherId, count] of teacherCourseCount) {
            if (!usedMentorIds.has(teacherId) && count > maxCourses) {
                maxCourses = count;
                selectedMentor = teacherId;
            }
        }

        if (!selectedMentor) {
            for (const teacher of insertedTeachers) {
                if (!usedMentorIds.has(teacher.id)) {
                    selectedMentor = teacher.id;
                    break;
                }
            }
        }

        if (selectedMentor) {
            usedMentorIds.add(selectedMentor);
            const mentor = insertedTeachers.find(t => t.id === selectedMentor)!;
            const mentorData = newTeachers.find(t => t.name === mentor.name)!;

            console.log(`${groupKey}: ${mentor.name} (${mentorData.subjectDisplay})`);
            groupClasses.forEach(cls => console.log(`  └─ ${cls.classCode}`));

            for (const cls of groupClasses) {
                mentorAssignments.push({
                    classId: cls.id,
                    teacherId: selectedMentor,
                });
            }
        }
    }

    if (mentorAssignments.length > 0) {
        await db.insert(classMentors).values(
            mentorAssignments.map(m => ({
                classId: m.classId,
                teacherId: m.teacherId,
                isPrimary: 1,
            }))
        );
    }

    console.log(`\n✅ Tilldelade ${mentorAssignments.length} mentorskap till ${usedMentorIds.size} lärare`);

    console.log('\n=== KLART! ===\n');
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
