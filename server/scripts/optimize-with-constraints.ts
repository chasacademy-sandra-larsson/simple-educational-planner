/**
 * Engångsscript: Optimerar lärarfördelning med hårda constraints (max 600p/lärare,
 * max antal lärare = minimum + 10%, inga otilldelade kurser). Använder backtracking
 * för att omfördela kurser vid kapacitetsbrist.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { teachers, courseInstances, projectClasses, projects } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

const MAX_POINTS_PER_TEACHER = 600;
const BUFFER_PERCENT = 0.10; // 10%

// Kursnamn till ämne mapping
function getCourseSubject(courseName: string): string[] {
    const name = courseName.toLowerCase();

    if (name.startsWith('svenska') || name.startsWith('sve')) return ['Svenska'];
    if (name.startsWith('engelska') || name.startsWith('eng')) return ['Engelska'];
    if (name.startsWith('moderna')) return ['Moderna språk', 'Engelska'];
    if (name.startsWith('matematik') || name.startsWith('mat')) return ['Matematik'];
    if (name.startsWith('fysik') || name.startsWith('fys')) return ['Fysik'];
    if (name.startsWith('kemi') || name.startsWith('kem')) return ['Kemi'];
    if (name.startsWith('biologi') || name.startsWith('bio')) return ['Biologi', 'Naturkunskap'];
    if (name.startsWith('teknik') || name.startsWith('tek')) return ['Teknik'];
    if (name.startsWith('programmering') || name.startsWith('pro')) return ['Programmering', 'Teknik'];
    if (name.startsWith('historia') || name.startsWith('his')) return ['Historia'];
    if (name.startsWith('samhällskunskap') || name.startsWith('sam')) return ['Samhällskunskap'];
    if (name.startsWith('religion') || name.startsWith('rel')) return ['Religion'];
    if (name.startsWith('idrott') || name.startsWith('idh')) return ['Idrott'];
    if (name.startsWith('naturkunskap') || name.startsWith('nat')) return ['Naturkunskap', 'Biologi', 'Kemi'];
    if (name.startsWith('geografi') || name.startsWith('geo')) return ['Geografi', 'Samhällskunskap'];
    if (name.startsWith('filosofi') || name.startsWith('fil')) return ['Filosofi', 'Religion'];
    if (name.startsWith('psykologi') || name.startsWith('psy')) return ['Psykologi', 'Religion'];
    if (name.includes('gymnasiearbete')) return ['Gymnasiearbete', 'Teknik', 'Naturkunskap', 'Samhällskunskap'];
    if (name.includes('individuellt')) return ['Individuellt val', 'Teknik', 'Naturkunskap', 'Samhällskunskap'];

    return ['Övrigt'];
}

function canTeach(teacherSubjects: string[], courseSubjects: string[]): boolean {
    return courseSubjects.some(cs =>
        teacherSubjects.some(ts =>
            ts.toLowerCase().includes(cs.toLowerCase()) ||
            cs.toLowerCase().includes(ts.toLowerCase())
        )
    );
}

async function optimize() {
    console.log('🎓 Optimerar lärarfördelning med constraints...\n');

    // Hämta projekt
    const [project] = await db.select().from(projects)
        .where(eq(projects.name, 'Gymnasium 27 Klasser')).limit(1);

    if (!project) {
        console.error('❌ Projekt "Gymnasium 27 Klasser" hittades inte');
        return;
    }

    // Nollställ alla tilldelningar
    await db.update(courseInstances).set({ teacherId: null });
    console.log('🔄 Nollställde alla tilldelningar\n');

    // Hämta kurser för läsår 2026/2027
    // Klasser startade 2024 → år 3, 2025 → år 2, 2026 → år 1
    const allCourses = await db.execute(sql`
        SELECT ci.id, ci.course_code, ci.course_name, ci.points, ci.year,
               pc.class_code, pc.start_year
        FROM course_instances ci
        JOIN project_classes pc ON ci.class_id = pc.id
        WHERE pc.project_id = ${project.id}
          AND (
            (pc.start_year = 2024 AND ci.year = 3) OR
            (pc.start_year = 2025 AND ci.year = 2) OR
            (pc.start_year = 2026 AND ci.year = 1)
          )
        ORDER BY ci.points DESC
    `) as any[];

    const allTeachers = await db.select().from(teachers)
        .where(eq(teachers.projectId, project.id));

    // Beräkna behov
    const totalPoints = allCourses.reduce((sum, c) => sum + c.points, 0);
    const minTeachers = Math.ceil(totalPoints / MAX_POINTS_PER_TEACHER);
    const maxTeachers = Math.ceil(minTeachers * (1 + BUFFER_PERCENT));

    console.log('📊 Statistik:');
    console.log(`   Totalt poäng: ${totalPoints.toLocaleString()}`);
    console.log(`   Antal kurser: ${allCourses.length}`);
    console.log(`   Min lärare (${totalPoints}/${MAX_POINTS_PER_TEACHER}): ${minTeachers}`);
    console.log(`   Max lärare (+10%): ${maxTeachers}`);
    console.log(`   Nuvarande lärare: ${allTeachers.length}`);
    console.log('');

    // Kontrollera constraint 2
    if (allTeachers.length > maxTeachers) {
        console.log(`⚠️  För många lärare! Har ${allTeachers.length}, max ${maxTeachers}`);
        console.log(`   Behöver ta bort ${allTeachers.length - maxTeachers} lärare`);
    } else if (allTeachers.length < minTeachers) {
        console.log(`⚠️  För få lärare! Har ${allTeachers.length}, min ${minTeachers}`);
        console.log(`   Behöver lägga till ${minTeachers - allTeachers.length} lärare`);
    } else {
        console.log(`✅ Antal lärare OK: ${allTeachers.length} (${minTeachers}-${maxTeachers})`);
    }
    console.log('');

    // Initiera lärarload
    const teacherLoad: Record<string, number> = {};
    const teacherSubjects: Record<string, string[]> = {};
    allTeachers.forEach(t => {
        teacherLoad[t.id] = 0;
        teacherSubjects[t.id] = t.subject ? t.subject.split(', ').map(s => s.trim()) : [];
    });

    // Analysera vilka ämnen som saknas
    const subjectNeed: Record<string, number> = {};
    const subjectCapacity: Record<string, number> = {};

    // Räkna bara primära ämnet för varje kurs (första i listan)
    allCourses.forEach(c => {
        const subjects = getCourseSubject(c.course_name);
        const primarySubject = subjects[0];
        subjectNeed[primarySubject] = (subjectNeed[primarySubject] || 0) + c.points;
    });

    allTeachers.forEach(t => {
        const subjects = t.subject ? t.subject.split(', ').map((s: string) => s.trim()) : [];
        subjects.forEach(s => {
            subjectCapacity[s] = (subjectCapacity[s] || 0) + MAX_POINTS_PER_TEACHER;
        });
    });

    // Räkna tillgängliga lärare per ämne för att prioritera knappa resurser
    const subjectTeacherCount: Record<string, number> = {};
    allTeachers.forEach(t => {
        const subjects = teacherSubjects[t.id];
        subjects.forEach(s => {
            subjectTeacherCount[s.toLowerCase()] = (subjectTeacherCount[s.toLowerCase()] || 0) + 1;
        });
    });

    // Beräkna efterfrågan/kapacitet-kvot per ämne
    const subjectDemandRatio: Record<string, number> = {};
    Object.keys(subjectNeed).forEach(s => {
        const need = subjectNeed[s] || 0;
        const cap = subjectCapacity[s] || 1;
        subjectDemandRatio[s.toLowerCase()] = need / cap;
    });


    // Sortera kurser: högst efterfrågan/kapacitet-kvot först (mest konkurrens om kapacitet)
    const sortedCourses = [...allCourses].sort((a, b) => {
        const aSubjects = getCourseSubject(a.course_name);
        const bSubjects = getCourseSubject(b.course_name);
        const aMaxRatio = Math.max(...aSubjects.map(s => subjectDemandRatio[s.toLowerCase()] || 0));
        const bMaxRatio = Math.max(...bSubjects.map(s => subjectDemandRatio[s.toLowerCase()] || 0));
        // Högst konkurrens först
        if (aMaxRatio !== bMaxRatio) return bMaxRatio - aMaxRatio;
        return b.points - a.points;
    });

    const assignments: { courseId: string; teacherId: string }[] = [];
    const unassigned: any[] = [];

    for (const course of sortedCourses) {
        const courseSubjects = getCourseSubject(course.course_name);

        // Hitta behöriga lärare med kapacitet
        const eligibleTeachers = allTeachers.filter(t => {
            const subjects = teacherSubjects[t.id];
            const hasCapacity = teacherLoad[t.id] + course.points <= MAX_POINTS_PER_TEACHER;
            const isQualified = canTeach(subjects, courseSubjects);
            return hasCapacity && isQualified;
        });

        if (eligibleTeachers.length === 0) {
            unassigned.push(course);
            continue;
        }

        // Sortera: lägst load först för jämn fördelning
        eligibleTeachers.sort((a, b) => teacherLoad[a.id] - teacherLoad[b.id]);
        const selectedTeacher = eligibleTeachers[0];

        teacherLoad[selectedTeacher.id] += course.points;
        assignments.push({ courseId: course.id, teacherId: selectedTeacher.id });
    }

    // Backtracking: försök omfördela för att få plats med otilldelade kurser
    if (unassigned.length > 0) {
        console.log('🔄 Omfördelar kurser...');

        for (let i = unassigned.length - 1; i >= 0; i--) {
            const course = unassigned[i];
            const courseSubjects = getCourseSubject(course.course_name);

            // Hitta behöriga lärare (även om de är fulla)
            const qualifiedTeachers = allTeachers.filter(t =>
                canTeach(teacherSubjects[t.id], courseSubjects));

            // Försök hitta en kurs att flytta
            for (const teacher of qualifiedTeachers) {
                const currentLoad = teacherLoad[teacher.id];
                const neededSpace = course.points - (MAX_POINTS_PER_TEACHER - currentLoad);

                if (neededSpace <= 0) continue; // Har redan kapacitet

                // Hitta en av lärarens kurser som kan flyttas till en annan lärare
                const teacherAssignments = assignments.filter(a => a.teacherId === teacher.id);

                for (const assignment of teacherAssignments) {
                    const assignedCourse = sortedCourses.find(c => c.id === assignment.courseId);
                    if (!assignedCourse || assignedCourse.points < neededSpace) continue;

                    const assignedCourseSubjects = getCourseSubject(assignedCourse.course_name);

                    // Hitta en annan lärare som kan ta denna kurs
                    const otherEligible = allTeachers.filter(t =>
                        t.id !== teacher.id &&
                        canTeach(teacherSubjects[t.id], assignedCourseSubjects) &&
                        teacherLoad[t.id] + assignedCourse.points <= MAX_POINTS_PER_TEACHER
                    );

                    if (otherEligible.length > 0) {
                        // Flytta kursen
                        const newTeacher = otherEligible.sort((a, b) =>
                            teacherLoad[a.id] - teacherLoad[b.id])[0];

                        assignment.teacherId = newTeacher.id;
                        teacherLoad[teacher.id] -= assignedCourse.points;
                        teacherLoad[newTeacher.id] += assignedCourse.points;

                        // Tilldela den otilldelade kursen
                        if (teacherLoad[teacher.id] + course.points <= MAX_POINTS_PER_TEACHER) {
                            teacherLoad[teacher.id] += course.points;
                            assignments.push({ courseId: course.id, teacherId: teacher.id });
                            unassigned.splice(i, 1);
                            console.log(`   ✅ ${course.course_name} → ${teacher.name}`);
                            break;
                        }
                    }
                }
                if (!unassigned.includes(course)) break;
            }
        }
    }

    // Uppdatera databasen
    console.log('💾 Sparar tilldelningar...');
    for (const assignment of assignments) {
        await db.update(courseInstances)
            .set({ teacherId: assignment.teacherId })
            .where(eq(courseInstances.id, assignment.courseId));
    }

    // Rapport
    console.log('\n📈 Resultat:');
    console.log(`   Tilldelade kurser: ${assignments.length}`);
    console.log(`   Otilldelade kurser: ${unassigned.length}`);

    if (unassigned.length > 0) {
        console.log('\n❌ CONSTRAINT 3 BRUTEN: Otilldelade kurser!');

        // Gruppera otilldelade per ämne
        const unassignedBySubject: Record<string, number> = {};
        unassigned.forEach(c => {
            const subjects = getCourseSubject(c.course_name);
            const key = subjects[0];
            unassignedBySubject[key] = (unassignedBySubject[key] || 0) + c.points;
        });

        console.log('\n   Saknade behörigheter:');
        Object.entries(unassignedBySubject)
            .sort((a, b) => b[1] - a[1])
            .forEach(([subject, points]) => {
                const teachersNeeded = Math.ceil(points / MAX_POINTS_PER_TEACHER);
                console.log(`   - ${subject}: ${points}p (behöver ${teachersNeeded} lärare till)`);
            });
    } else {
        console.log('\n✅ CONSTRAINT 3 OK: Alla kurser tilldelade!');
    }

    // Visa lärarfördelning
    console.log('\n👩‍🏫 Lärarfördelning:');
    const teacherStats = allTeachers
        .map(t => ({ name: t.name, points: teacherLoad[t.id], subject: t.subject }))
        .sort((a, b) => b.points - a.points);

    let under600 = 0, at600 = 0, over600 = 0;
    teacherStats.forEach(t => {
        const status = t.points > MAX_POINTS_PER_TEACHER ? '❌' :
                       t.points === MAX_POINTS_PER_TEACHER ? '✅' :
                       t.points >= 500 ? '📊' : '⚠️';
        console.log(`   ${status} ${t.name}: ${t.points}p`);

        if (t.points > MAX_POINTS_PER_TEACHER) over600++;
        else if (t.points === MAX_POINTS_PER_TEACHER) at600++;
        else under600++;
    });

    console.log('\n📊 Sammanfattning:');
    console.log(`   Lärare under 600p: ${under600}`);
    console.log(`   Lärare på 600p: ${at600}`);
    console.log(`   Lärare över 600p: ${over600}`);
    console.log(`   Constraint 1 (max 600p): ${over600 === 0 ? '✅ OK' : '❌ BRUTEN'}`);
    console.log(`   Constraint 2 (max ${maxTeachers} lärare): ${allTeachers.length <= maxTeachers ? '✅ OK' : '❌ BRUTEN'}`);
    console.log(`   Constraint 3 (inga otilldelade): ${unassigned.length === 0 ? '✅ OK' : '❌ BRUTEN'}`);
}

optimize().catch(console.error);
