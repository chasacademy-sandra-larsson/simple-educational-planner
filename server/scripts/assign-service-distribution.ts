/**
 * Engångsscript: Tilldelar kurser till lärare (~600p per heltidstjänst) och sätter
 * mentorer per klass-spår (samma mentor följer klassen genom alla 3 åren).
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projects, projectClasses, courseInstances, teachers, classMentors } from '../src/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

const ACADEMIC_YEAR = 2026; // För läsår 2026/2027
const TARGET_POINTS = 600; // Mål för 100% tjänst

// Beräkna vilken årskurs en klass är i för ett givet läsår
function getClassYearLevel(startYear: number, academicYear: number): number {
    return academicYear - startYear + 1;
}

// Ämnesgruppering för matchning av lärare till kurser
const SUBJECT_MAPPINGS: { [key: string]: string[] } = {
    'Matematik': ['matematik', 'matmat'],
    'Fysik': ['fysik', 'fysfys'],
    'Kemi': ['kemi', 'kemkem'],
    'Biologi': ['biologi', 'biobio'],
    'Historia': ['historia', 'hishis'],
    'Samhällskunskap': ['samhälle', 'samsam'],
    'Svenska': ['svenska', 'svesve'],
    'Engelska': ['engelska', 'engeng'],
    'Geografi': ['geografi', 'geogeo'],
    'Religion': ['religion', 'relrel'],
    'Idrott': ['idrott', 'idhidh', 'hälsa'],
    'Teknik': ['teknik', 'tektek'],
    'Programmering': ['programmering', 'prrprr'],
    'Psykologi': ['psykologi', 'psypsy'],
    'Filosofi': ['filosofi', 'filfil'],
    'Moderna språk': ['moderna språk', 'modspr', 'spanska', 'tyska', 'franska'],
    'Naturkunskap': ['naturkunskap', 'naknaf', 'naknak', 'naturvetenskaplig'],
};

// Kontrollera om en lärare matchar en kurs
function teacherMatchesCourse(teacherSubject: string | null, courseCode: string, courseName: string): boolean {
    if (!teacherSubject) return false;

    const keywords = SUBJECT_MAPPINGS[teacherSubject] || [teacherSubject.toLowerCase()];
    const lowerCode = courseCode.toLowerCase();
    const lowerName = courseName.toLowerCase();

    return keywords.some(keyword =>
        lowerCode.includes(keyword) || lowerName.includes(keyword)
    );
}

async function main() {
    console.log('=== TJÄNSTEFÖRDELNING FÖR GYMNASIUM 27 KLASSER ===\n');
    console.log(`Läsår: ${ACADEMIC_YEAR}/${ACADEMIC_YEAR + 1}`);
    console.log(`Mål per lärare: ${TARGET_POINTS} poäng\n`);

    // 1. Hämta projektet
    const [project] = await db.select()
        .from(projects)
        .where(eq(projects.name, 'Gymnasium 27 Klasser'))
        .limit(1);

    if (!project) {
        console.error('❌ Projektet "Gymnasium 27 Klasser" hittades inte!');
        process.exit(1);
    }
    console.log(`✅ Hittade projekt: ${project.name} (${project.id})\n`);

    // 2. Hämta alla klasser
    const allClasses = await db.select()
        .from(projectClasses)
        .where(eq(projectClasses.projectId, project.id));

    console.log(`📚 Antal klasser: ${allClasses.length}`);

    // 3. Filtrera aktiva klasser för läsåret
    const activeClasses = allClasses.filter(cls => {
        const yearLevel = getClassYearLevel(cls.startYear, ACADEMIC_YEAR);
        return yearLevel >= 1 && yearLevel <= 3;
    });
    console.log(`📚 Aktiva klasser för läsåret: ${activeClasses.length}\n`);

    // 4. Hämta alla kurser för dessa klasser
    const classIds = activeClasses.map(c => c.id);
    const allCourses = await db.select()
        .from(courseInstances)
        .where(inArray(courseInstances.classId, classIds));

    // 5. Filtrera kurser för det relevanta året
    const relevantCourses = allCourses.filter(course => {
        const classItem = activeClasses.find(c => c.id === course.classId);
        if (!classItem) return false;
        const classYearLevel = getClassYearLevel(classItem.startYear, ACADEMIC_YEAR);
        return course.year === classYearLevel;
    });

    const totalPoints = relevantCourses.reduce((sum, c) => sum + c.points, 0);
    console.log(`📖 Totalt antal kurser för läsåret: ${relevantCourses.length}`);
    console.log(`📊 Totala poäng: ${totalPoints}p`);
    console.log(`👥 Antal heltidstjänster som behövs: ${Math.ceil(totalPoints / TARGET_POINTS)}\n`);

    // 6. Hämta alla lärare
    const allTeachers = await db.select()
        .from(teachers)
        .where(eq(teachers.projectId, project.id));

    console.log(`👨‍🏫 Antal lärare: ${allTeachers.length}\n`);

    // 7. Skapa en karta för lärarnas poäng
    interface TeacherAllocation {
        teacher: typeof allTeachers[0];
        points: number;
        courses: typeof relevantCourses;
    }

    const teacherAllocations: Map<string, TeacherAllocation> = new Map();
    allTeachers.forEach(t => {
        teacherAllocations.set(t.id, { teacher: t, points: 0, courses: [] });
    });

    // 8. Gruppera kurser efter ämne
    interface CourseWithClass {
        course: typeof relevantCourses[0];
        classItem: typeof activeClasses[0];
    }

    const coursesBySubject: Map<string, CourseWithClass[]> = new Map();

    relevantCourses.forEach(course => {
        const classItem = activeClasses.find(c => c.id === course.classId)!;
        // Använd första delen av kurskoden som nyckel
        const subjectKey = course.courseCode.substring(0, 6);

        if (!coursesBySubject.has(subjectKey)) {
            coursesBySubject.set(subjectKey, []);
        }
        coursesBySubject.get(subjectKey)!.push({ course, classItem });
    });

    console.log('=== STEG 1: TILLDELA KURSER TILL LÄRARE ===\n');

    // Beräkna idealpoäng per lärare
    const idealPointsPerTeacher = Math.ceil(totalPoints / allTeachers.length);
    console.log(`Idealpoäng per lärare: ${idealPointsPerTeacher}p\n`);

    // 9. Tilldela kurser till lärare med jämn fördelning
    const assignments: { courseId: string; teacherId: string; points: number }[] = [];

    // Sortera kurser efter poäng (störst först) för bättre packning
    const sortedCourses = [...relevantCourses].sort((a, b) => b.points - a.points);

    // Tilldela varje kurs till läraren som har minst poäng och matchar ämnet
    for (const course of sortedCourses) {
        // Hitta matchande lärare
        const matchingTeachers = allTeachers.filter(t =>
            teacherMatchesCourse(t.subject, course.courseCode, course.courseName)
        );

        // Sortera alla lärare efter nuvarande poäng
        const teachersByPoints = [...allTeachers].sort((a, b) => {
            const aPoints = teacherAllocations.get(a.id)!.points;
            const bPoints = teacherAllocations.get(b.id)!.points;
            return aPoints - bPoints;
        });

        let assignedTeacher: typeof allTeachers[0] | null = null;

        // Välj den matchande läraren med minst poäng om någon matchar och har utrymme
        if (matchingTeachers.length > 0) {
            const matchingByPoints = matchingTeachers.sort((a, b) => {
                const aPoints = teacherAllocations.get(a.id)!.points;
                const bPoints = teacherAllocations.get(b.id)!.points;
                return aPoints - bPoints;
            });

            // Välj matchande lärare om den inte har för mycket mer än idealet
            const candidate = matchingByPoints[0];
            const candidatePoints = teacherAllocations.get(candidate.id)!.points;
            const minNonMatchingPoints = teacherAllocations.get(teachersByPoints[0].id)!.points;

            // Acceptera matchande lärare om skillnaden inte är för stor
            if (candidatePoints - minNonMatchingPoints < 300) {
                assignedTeacher = candidate;
            }
        }

        // Om ingen matchande lärare valdes, välj den med minst poäng
        if (!assignedTeacher) {
            assignedTeacher = teachersByPoints[0];
        }

        // Tilldela kursen
        const allocation = teacherAllocations.get(assignedTeacher.id)!;
        allocation.points += course.points;
        allocation.courses.push(course);

        assignments.push({
            courseId: course.id,
            teacherId: assignedTeacher.id,
            points: course.points,
        });
    }

    // 10. Uppdatera databasen med kursallokeringar
    console.log('Uppdaterar kurser i databasen...');

    for (const assignment of assignments) {
        await db.update(courseInstances)
            .set({ teacherId: assignment.teacherId })
            .where(eq(courseInstances.id, assignment.courseId));
    }

    console.log(`✅ Tilldelade ${assignments.length} kurser till lärare\n`);

    // 11. Skriv ut fördelningen
    console.log('=== TJÄNSTEFÖRDELNING RESULTAT ===\n');

    const sortedAllocations = [...teacherAllocations.values()]
        .sort((a, b) => b.points - a.points);

    let teachersAt100Percent = 0;
    let teachersOver100Percent = 0;
    let teachersUnder50Percent = 0;

    sortedAllocations.forEach(alloc => {
        const percentage = Math.round((alloc.points / TARGET_POINTS) * 100);
        const status = percentage >= 100 ? '🔴' : percentage >= 80 ? '🟢' : percentage >= 50 ? '🟡' : '⚪';

        if (percentage >= 100) teachersAt100Percent++;
        if (percentage > 100) teachersOver100Percent++;
        if (percentage < 50 && alloc.points > 0) teachersUnder50Percent++;

        console.log(`${status} ${alloc.teacher.name.padEnd(25)} ${String(alloc.points).padStart(4)}p (${String(percentage).padStart(3)}%) - ${alloc.teacher.subject || 'Ej angivet'}`);
    });

    console.log('\n--- Sammanfattning ---');
    console.log(`🟢 Lärare vid/nära 100%: ${teachersAt100Percent}`);
    console.log(`🔴 Överbelastade (>100%): ${teachersOver100Percent}`);
    console.log(`⚪ Underutnyttjade (<50%): ${teachersUnder50Percent}`);

    // 12. MENTORSKAP
    console.log('\n=== STEG 2: TILLDELA MENTORER ===\n');

    // Ta bort befintliga mentorskap
    await db.delete(classMentors)
        .where(inArray(classMentors.classId, classIds));

    // Gruppera klasser efter program och parallel
    // Mål: En lärare ska vara mentor för samma "spår" genom alla årskurser
    // T.ex. TE1a, TE2a, TE3a ska ha samma mentor

    const classGroups: Map<string, typeof activeClasses> = new Map();

    activeClasses.forEach(cls => {
        // Extrahera program och parallel från classCode (t.ex. "TE1a" -> "TE" + "a")
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

    console.log(`Hittade ${classGroups.size} klass-spår:\n`);

    // Tilldela en mentor per klass-spår
    // Välj lärare som har kurser i detta program
    const mentorAssignments: { classId: string; teacherId: string }[] = [];
    const usedMentorIds = new Set<string>();

    for (const [groupKey, groupClasses] of classGroups) {
        // Hitta lärare som undervisar i dessa klasser och inte redan är mentor
        const classIdsInGroup = groupClasses.map(c => c.id);

        // Räkna vilka lärare som har flest kurser i denna grupp
        const teacherCourseCount: Map<string, number> = new Map();

        for (const cls of groupClasses) {
            const coursesInClass = assignments.filter(a =>
                relevantCourses.find(c => c.id === a.courseId)?.classId === cls.id
            );

            coursesInClass.forEach(c => {
                const count = teacherCourseCount.get(c.teacherId) || 0;
                teacherCourseCount.set(c.teacherId, count + 1);
            });
        }

        // Välj den lärare som undervisar mest i gruppen och inte redan är mentor
        let selectedMentor: string | null = null;
        let maxCourses = 0;

        for (const [teacherId, count] of teacherCourseCount) {
            if (!usedMentorIds.has(teacherId) && count > maxCourses) {
                maxCourses = count;
                selectedMentor = teacherId;
            }
        }

        // Om ingen lärare hittades, välj en som inte är mentor ännu
        if (!selectedMentor) {
            for (const teacher of allTeachers) {
                if (!usedMentorIds.has(teacher.id)) {
                    selectedMentor = teacher.id;
                    break;
                }
            }
        }

        if (selectedMentor) {
            usedMentorIds.add(selectedMentor);
            const mentorTeacher = allTeachers.find(t => t.id === selectedMentor)!;

            console.log(`${groupKey}: ${mentorTeacher.name}`);
            groupClasses.forEach(cls => {
                console.log(`  └─ ${cls.classCode}`);
            });

            // Tilldela mentor till alla klasser i gruppen
            for (const cls of groupClasses) {
                mentorAssignments.push({
                    classId: cls.id,
                    teacherId: selectedMentor,
                });
            }
        }
    }

    // Spara mentorskap i databasen
    if (mentorAssignments.length > 0) {
        await db.insert(classMentors).values(
            mentorAssignments.map(m => ({
                classId: m.classId,
                teacherId: m.teacherId,
                isPrimary: 1,
            }))
        );
    }

    console.log(`\n✅ Tilldelade ${mentorAssignments.length} mentorskap`);
    console.log(`👥 Antal unika mentorer: ${usedMentorIds.size}`);

    // Visa mentorer per lärare
    console.log('\n=== MENTORSKAP PER LÄRARE ===\n');

    for (const teacherId of usedMentorIds) {
        const teacher = allTeachers.find(t => t.id === teacherId)!;
        const mentorClasses = mentorAssignments
            .filter(m => m.teacherId === teacherId)
            .map(m => activeClasses.find(c => c.id === m.classId)!.classCode);

        console.log(`${teacher.name}: ${mentorClasses.join(', ')}`);
    }

    console.log('\n=== KLART! ===');
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
