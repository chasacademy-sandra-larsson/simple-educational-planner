/**
 * Engångsscript: Tilldelar otilldelade kurser till lärare baserat på ämnesmatchning.
 * Fas 1: max 600p/lärare. Fas 2: fördelar överskott jämnt om kurser kvarstår.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { teachers, courseInstances, projectClasses } from '../src/db/schema';
import { eq, isNull, sql } from 'drizzle-orm';

const MAX_POINTS_PER_TEACHER = 600;

// Mappning från kurskoder till ämnen
const COURSE_TO_SUBJECT: Record<string, string[]> = {
    // Svenska
    'SVESVE01': ['Svenska'],
    'SVESVE02': ['Svenska'],
    'SVESVE03': ['Svenska'],

    // Engelska
    'ENGENG05': ['Engelska'],
    'ENGENG06': ['Engelska'],
    'ENGENG07': ['Engelska'],

    // Matematik
    'MATMAT01c': ['Matematik'],
    'MATMAT02c': ['Matematik'],
    'MATMAT03c': ['Matematik'],
    'MATMAT04': ['Matematik'],

    // Fysik
    'FYSFYS01a': ['Fysik'],
    'FYSFYS02': ['Fysik'],
    'FYSFYS03': ['Fysik'],

    // Kemi
    'KEMKEM01': ['Kemi'],
    'KEMKEM02': ['Kemi'],
    'KEMKEM03': ['Kemi'],

    // Biologi
    'BIOBIO01': ['Biologi'],
    'BIOBIO02': ['Biologi'],

    // Teknik
    'TEKTEK01': ['Teknik'],
    'TEKTEK02': ['Teknik'],

    // Programmering
    'PRRPRR01': ['Programmering', 'Teknik'],
    'PRRPRR02': ['Programmering', 'Teknik'],

    // Historia
    'HISHIS01a1': ['Historia'],
    'HISHIS01a2': ['Historia'],

    // Samhällskunskap
    'SAMSAM01b': ['Samhällskunskap'],

    // Religion
    'RELREL01': ['Religion'],

    // Idrott
    'IDHIDH01': ['Idrott'],

    // Naturkunskap
    'NAKNAK00S': ['Naturkunskap', 'Biologi', 'Kemi', 'Fysik'],

    // Gymnasiearbete
    'EXAEXMTE': ['Gymnasiearbete', 'Teknik'],
    'EXAEXMNA': ['Gymnasiearbete', 'Naturkunskap'],
    'EXAEXMSA': ['Gymnasiearbete', 'Samhällskunskap'],

    // Individuellt val
    'INDTE01': ['Individuellt val', 'Teknik'],
    'INDTE02': ['Individuellt val', 'Teknik'],
    'INDNA01': ['Individuellt val', 'Naturkunskap'],
    'INDNA02': ['Individuellt val', 'Naturkunskap'],
    'INDSA01': ['Individuellt val', 'Samhällskunskap'],
    'INDSA02': ['Individuellt val', 'Samhällskunskap'],
};

interface Teacher {
    id: string;
    name: string;
    subjects: string[];
    currentPoints: number;
    assignedCourses: string[];
}

interface CourseInstance {
    id: string;
    courseCode: string;
    courseName: string;
    points: number;
    classId: string;
    className?: string;
}

async function getTeachersWithLoad(): Promise<Teacher[]> {
    const result = await db.execute(sql`
        SELECT
            t.id,
            t.name,
            t.subject,
            COALESCE(SUM(ci.points), 0)::int as current_points,
            ARRAY_AGG(ci.course_code) FILTER (WHERE ci.course_code IS NOT NULL) as assigned_courses
        FROM teachers t
        LEFT JOIN course_instances ci ON t.id = ci.teacher_id
        GROUP BY t.id, t.name, t.subject
    `);

    const rows = result as any[];
    return rows.map(row => ({
        id: row.id,
        name: row.name,
        subjects: row.subject ? row.subject.split(', ').map((s: string) => s.trim()) : [],
        currentPoints: parseInt(row.current_points) || 0,
        assignedCourses: row.assigned_courses || [],
    }));
}

async function getUnassignedCourses(): Promise<CourseInstance[]> {
    const result = await db.execute(sql`
        SELECT
            ci.id,
            ci.course_code,
            ci.course_name,
            ci.points,
            ci.class_id,
            pc.class_code as class_name
        FROM course_instances ci
        JOIN project_classes pc ON ci.class_id = pc.id
        WHERE ci.teacher_id IS NULL
        ORDER BY ci.points DESC, ci.course_code
    `);

    const rows = result as any[];
    return rows.map(row => ({
        id: row.id,
        courseCode: row.course_code,
        courseName: row.course_name,
        points: parseInt(row.points) || 0,
        classId: row.class_id,
        className: row.class_name,
    }));
}

function canTeach(teacher: Teacher, course: CourseInstance): boolean {
    const requiredSubjects = COURSE_TO_SUBJECT[course.courseCode] || [];

    // Om kursen inte finns i mappningen, försök matcha baserat på kursnamnet
    if (requiredSubjects.length === 0) {
        const courseName = course.courseName.toLowerCase();
        return teacher.subjects.some(subject =>
            courseName.includes(subject.toLowerCase())
        );
    }

    // Kontrollera om läraren har någon av de behörigheter som krävs
    return requiredSubjects.some(required =>
        teacher.subjects.some(teacherSubject =>
            teacherSubject.toLowerCase().includes(required.toLowerCase()) ||
            required.toLowerCase().includes(teacherSubject.toLowerCase())
        )
    );
}

function findBestTeacher(teachers: Teacher[], course: CourseInstance, maxPoints: number): Teacher | null {
    // Hitta lärare som kan undervisa kursen och har kapacitet
    const eligibleTeachers = teachers.filter(t =>
        canTeach(t, course) &&
        t.currentPoints + course.points <= maxPoints
    );

    if (eligibleTeachers.length === 0) return null;

    // Prioritera lärare med lägst nuvarande belastning (för att jämna ut)
    // Men också de som kommer närmast maxPoints efter tilldelning
    eligibleTeachers.sort((a, b) => {
        const aAfter = a.currentPoints + course.points;
        const bAfter = b.currentPoints + course.points;

        // Prioritera den som kommer närmast men under max
        const aDiff = maxPoints - aAfter;
        const bDiff = maxPoints - bAfter;

        return aDiff - bDiff; // Mindre diff = bättre (närmare max)
    });

    return eligibleTeachers[0];
}

async function optimizeAllocation() {
    console.log('🎓 Startar optimering av lärarfördelning...\n');

    // Hämta data
    const teacherList = await getTeachersWithLoad();
    const unassignedCourses = await getUnassignedCourses();

    console.log(`📊 Statistik:`);
    console.log(`   Antal lärare: ${teacherList.length}`);
    console.log(`   Ofördelade kurser: ${unassignedCourses.length}`);
    console.log(`   Ofördelade poäng: ${unassignedCourses.reduce((sum, c) => sum + c.points, 0)}`);
    console.log(`   Max kapacitet (${teacherList.length} × 600p): ${teacherList.length * MAX_POINTS_PER_TEACHER}`);
    console.log('');

    // Visa lärare och deras behörigheter
    console.log('👩‍🏫 Lärare och behörigheter:');
    teacherList.forEach(t => {
        console.log(`   ${t.name}: ${t.subjects.join(', ')} (${t.currentPoints}p)`);
    });
    console.log('');

    // Fas 1: Fördela till 600p max
    console.log('📝 Fas 1: Fördelning till 600p max per lärare...');
    let phase1Assigned = 0;

    for (const course of unassignedCourses) {
        const teacher = findBestTeacher(teacherList, course, MAX_POINTS_PER_TEACHER);

        if (teacher) {
            // Uppdatera i minnet
            teacher.currentPoints += course.points;
            teacher.assignedCourses.push(course.courseCode);

            // Uppdatera i databasen
            await db.update(courseInstances)
                .set({ teacherId: teacher.id })
                .where(eq(courseInstances.id, course.id));

            phase1Assigned++;
        }
    }

    console.log(`   Tilldelade ${phase1Assigned} kurser i fas 1`);

    // Hämta uppdaterad lista
    const remainingCourses = await getUnassignedCourses();
    console.log(`   Kvarvarande ofördelade: ${remainingCourses.length} kurser`);
    console.log('');

    // Fas 2: Om det finns kvar, fördela jämnt (tillåt över 600p)
    if (remainingCourses.length > 0) {
        console.log('📝 Fas 2: Fördelning av överskott (över 600p)...');

        // Uppdatera lärardata
        const updatedTeachers = await getTeachersWithLoad();
        let phase2Assigned = 0;

        for (const course of remainingCourses) {
            // Hitta lärare som kan undervisa, oavsett belastning
            const eligibleTeachers = updatedTeachers.filter(t => canTeach(t, course));

            if (eligibleTeachers.length > 0) {
                // Välj den med lägst belastning
                eligibleTeachers.sort((a, b) => a.currentPoints - b.currentPoints);
                const teacher = eligibleTeachers[0];

                teacher.currentPoints += course.points;

                await db.update(courseInstances)
                    .set({ teacherId: teacher.id })
                    .where(eq(courseInstances.id, course.id));

                phase2Assigned++;
            }
        }

        console.log(`   Tilldelade ${phase2Assigned} kurser i fas 2`);
    }

    // Slutrapport
    console.log('\n📈 Slutrapport:');
    const finalTeachers = await getTeachersWithLoad();

    let totalAssigned = 0;
    let teachersUnder600 = 0;
    let teachersAt600 = 0;
    let teachersOver600 = 0;

    finalTeachers.sort((a, b) => b.currentPoints - a.currentPoints);

    for (const t of finalTeachers) {
        totalAssigned += t.currentPoints;
        if (t.currentPoints < MAX_POINTS_PER_TEACHER) teachersUnder600++;
        else if (t.currentPoints === MAX_POINTS_PER_TEACHER) teachersAt600++;
        else teachersOver600++;

        const status = t.currentPoints > MAX_POINTS_PER_TEACHER ? '⚠️' :
                       t.currentPoints === MAX_POINTS_PER_TEACHER ? '✅' : '📊';
        console.log(`   ${status} ${t.name}: ${t.currentPoints}p (${t.subjects.join(', ')})`);
    }

    console.log('\n📊 Sammanfattning:');
    console.log(`   Total fördelade poäng: ${totalAssigned}`);
    console.log(`   Lärare under 600p: ${teachersUnder600}`);
    console.log(`   Lärare på exakt 600p: ${teachersAt600}`);
    console.log(`   Lärare över 600p: ${teachersOver600}`);

    const stillUnassigned = await getUnassignedCourses();
    if (stillUnassigned.length > 0) {
        console.log(`\n⚠️  ${stillUnassigned.length} kurser kunde inte tilldelas (saknar behörig lärare):`);
        const bySubject: Record<string, number> = {};
        stillUnassigned.forEach(c => {
            const key = c.courseName;
            bySubject[key] = (bySubject[key] || 0) + 1;
        });
        Object.entries(bySubject).forEach(([name, count]) => {
            console.log(`      ${name}: ${count} kurser`);
        });
    }

    console.log('\n✅ Optimering slutförd!');
}

optimizeAllocation().catch(console.error);
