/**
 * Engångsscript: Skapar 40 lärare med specifika kurskod-behörigheter och fördelar
 * kurser för läsåret 2026/2027 med max 600p per lärare. Sparar tjänstefördelningar.
 */

import { db } from '../src/db';
import { courseInstances, projectClasses, teachers, teacherServiceDistributions } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

const PROJECT_ID = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';
const MAX_POINTS = 600;

// Kurskoder per ämnesområde
const SUBJECTS = {
    svenska: ['SVESVE01', 'SVESVE02', 'SVESVE03'],
    engelska: ['ENGENG05', 'ENGENG06', 'ENGENG07'],
    matematik: ['MATMAT01b', 'MATMAT01c', 'MATMAT02b', 'MATMAT02c', 'MATMAT03c', 'MATMAT04', 'MATMAT05'],
    fysik: ['FYSFYS01a', 'FYSFYS02', 'FYSFYS03'],
    naturkunskap: ['NAKNAF01b', 'NAKNAK00S'],
    kemi: ['KEMKEM01', 'KEMKEM02', 'KEMKEM03'],
    biologi: ['BIOBIO01', 'BIOBIO02', 'BIOBIO03'],
    historia: ['HISHIS01a1', 'HISHIS01a2', 'HISHIS01b', 'HISHIS02b', 'HISHIS03'],
    samhallskunskap: ['SAMSAM01b', 'SAMSAM02', 'SAMSAM03'],
    religion: ['RELREL01', 'RELREL02'],
    geografi: ['GEOGEO01', 'GEOGEO02'],
    psykologi: ['PSYPSY01', 'PSYPSY02a'],
    filosofi: ['FILFIL01'],
    idrott: ['IDHIDH01'],
    teknik: ['TEKTEK01', 'TEKTEK02'],
    programmering: ['PRRPRR01', 'PRRPRR02'],
    modernasprak: ['MODSPR01', 'MODSPR02', 'MODSPR03'],
    // Gymnasiearbete - tilldelas ämneslärare
    gymnasiearbeteTE: ['EXAEXMTE'],
    gymnasiearbeteNA: ['EXAEXMNA'],
    gymnasiearbeteSA: ['EXAEXMSA'],
    // Individuellt val - tilldelas ämneslärare
    indvalTE: ['INDTE01', 'INDTE02'],
    indvalNA: ['INDNA01', 'INDNA02'],
    indvalSA: ['INDSA01', 'INDSA02'],
};

// 40 lärare med ämneskombinationer
const TEACHERS = [
    // SVENSKA: 2700p → 5 lärare (540p snitt)
    { name: 'Anna Lindberg', subject: 'Svenska', codes: [...SUBJECTS.svenska] },
    { name: 'Erik Johansson', subject: 'Svenska', codes: [...SUBJECTS.svenska] },
    { name: 'Maria Svensson', subject: 'Svenska', codes: [...SUBJECTS.svenska] },
    { name: 'Johan Nilsson', subject: 'Svenska', codes: [...SUBJECTS.svenska] },
    { name: 'Karin Andersson', subject: 'Svenska', codes: [...SUBJECTS.svenska] },

    // ENGELSKA + MODERNA SPRÅK: 2700p + 900p = 3600p → 6 lärare (600p snitt)
    { name: 'Fredrik Lund', subject: 'Engelska, Moderna språk', codes: [...SUBJECTS.engelska, ...SUBJECTS.modernasprak] },
    { name: 'Helena Ström', subject: 'Engelska, Moderna språk', codes: [...SUBJECTS.engelska, ...SUBJECTS.modernasprak] },
    { name: 'Anders Berg', subject: 'Engelska, Moderna språk', codes: [...SUBJECTS.engelska, ...SUBJECTS.modernasprak] },
    { name: 'Sofia Hellström', subject: 'Engelska, Moderna språk', codes: [...SUBJECTS.engelska, ...SUBJECTS.modernasprak] },
    { name: 'Marcus Öberg', subject: 'Engelska, Moderna språk', codes: [...SUBJECTS.engelska, ...SUBJECTS.modernasprak] },
    { name: 'Lena Fransson', subject: 'Engelska, Moderna språk', codes: [...SUBJECTS.engelska, ...SUBJECTS.modernasprak] },

    // MATEMATIK: 3300p → 6 lärare (550p snitt)
    { name: 'Per Karlsson', subject: 'Matematik', codes: [...SUBJECTS.matematik] },
    { name: 'Lisa Holm', subject: 'Matematik', codes: [...SUBJECTS.matematik] },
    { name: 'Thomas Eriksson', subject: 'Matematik', codes: [...SUBJECTS.matematik] },
    { name: 'Eva Pettersson', subject: 'Matematik', codes: [...SUBJECTS.matematik] },
    { name: 'Mikael Dahl', subject: 'Matematik', codes: [...SUBJECTS.matematik] },
    { name: 'Annika Löfgren', subject: 'Matematik', codes: [...SUBJECTS.matematik] },

    // FYSIK + NATURKUNSKAP: 1800p + 300p = 2100p → 4 lärare (525p snitt)
    { name: 'Henrik Sjöberg', subject: 'Fysik, Naturkunskap', codes: [...SUBJECTS.fysik, ...SUBJECTS.naturkunskap] },
    { name: 'Anna-Karin Olofsson', subject: 'Fysik, Naturkunskap', codes: [...SUBJECTS.fysik, ...SUBJECTS.naturkunskap] },
    { name: 'Stefan Månsson', subject: 'Fysik, Naturkunskap', codes: [...SUBJECTS.fysik, ...SUBJECTS.naturkunskap] },
    { name: 'Johanna Lindgren', subject: 'Fysik, Naturkunskap', codes: [...SUBJECTS.fysik, ...SUBJECTS.naturkunskap] },

    // KEMI + BIOLOGI + GYMNASIEARBETE NA + INDVAL NA: 1350p + 900p + 300p + 600p = 3150p → 6 lärare (525p snitt)
    { name: 'Emma Larsson', subject: 'Kemi, Biologi', codes: [...SUBJECTS.kemi, ...SUBJECTS.biologi, ...SUBJECTS.gymnasiearbeteNA, ...SUBJECTS.indvalNA] },
    { name: 'Daniel Gustafsson', subject: 'Kemi, Biologi', codes: [...SUBJECTS.kemi, ...SUBJECTS.biologi, ...SUBJECTS.gymnasiearbeteNA, ...SUBJECTS.indvalNA] },
    { name: 'Frida Björk', subject: 'Kemi, Biologi', codes: [...SUBJECTS.kemi, ...SUBJECTS.biologi, ...SUBJECTS.gymnasiearbeteNA, ...SUBJECTS.indvalNA] },
    { name: 'Susanne Wallin', subject: 'Kemi, Biologi', codes: [...SUBJECTS.kemi, ...SUBJECTS.biologi, ...SUBJECTS.gymnasiearbeteNA, ...SUBJECTS.indvalNA] },
    { name: 'Martin Sjögren', subject: 'Kemi, Biologi', codes: [...SUBJECTS.kemi, ...SUBJECTS.biologi, ...SUBJECTS.gymnasiearbeteNA, ...SUBJECTS.indvalNA] },
    { name: 'Elin Norberg', subject: 'Kemi, Biologi', codes: [...SUBJECTS.kemi, ...SUBJECTS.biologi, ...SUBJECTS.gymnasiearbeteNA, ...SUBJECTS.indvalNA] },

    // HISTORIA + RELIGION: 1500p + 600p = 2100p → 4 lärare (525p snitt)
    { name: 'Lars Bergman', subject: 'Historia, Religion', codes: [...SUBJECTS.historia, ...SUBJECTS.religion] },
    { name: 'Ingrid Forsberg', subject: 'Historia, Religion', codes: [...SUBJECTS.historia, ...SUBJECTS.religion] },
    { name: 'Bengt Åkesson', subject: 'Historia, Religion', codes: [...SUBJECTS.historia, ...SUBJECTS.religion] },
    { name: 'Ulrika Sandström', subject: 'Historia, Religion', codes: [...SUBJECTS.historia, ...SUBJECTS.religion] },

    // SAMHÄLLSKUNSKAP + GEOGRAFI + GYMNASIEARBETE SA + INDVAL SA: 1500p + 450p + 300p + 600p = 2850p → 5 lärare (570p snitt)
    { name: 'Nils Ekström', subject: 'Samhällskunskap, Geografi', codes: [...SUBJECTS.samhallskunskap, ...SUBJECTS.geografi, ...SUBJECTS.gymnasiearbeteSA, ...SUBJECTS.indvalSA] },
    { name: 'Sara Lind', subject: 'Samhällskunskap, Geografi', codes: [...SUBJECTS.samhallskunskap, ...SUBJECTS.geografi, ...SUBJECTS.gymnasiearbeteSA, ...SUBJECTS.indvalSA] },
    { name: 'Oscar Nordin', subject: 'Samhällskunskap, Geografi', codes: [...SUBJECTS.samhallskunskap, ...SUBJECTS.geografi, ...SUBJECTS.gymnasiearbeteSA, ...SUBJECTS.indvalSA] },
    { name: 'Camilla Ek', subject: 'Samhällskunskap, Geografi', codes: [...SUBJECTS.samhallskunskap, ...SUBJECTS.geografi, ...SUBJECTS.gymnasiearbeteSA, ...SUBJECTS.indvalSA] },
    { name: 'Tobias Strand', subject: 'Samhällskunskap, Geografi', codes: [...SUBJECTS.samhallskunskap, ...SUBJECTS.geografi, ...SUBJECTS.gymnasiearbeteSA, ...SUBJECTS.indvalSA] },

    // PSYKOLOGI + FILOSOFI: 450p → 1 lärare (450p)
    { name: 'Katarina Blom', subject: 'Psykologi, Filosofi', codes: [...SUBJECTS.psykologi, ...SUBJECTS.filosofi] },

    // IDROTT: 900p → 2 lärare (450p snitt)
    { name: 'Petra Nyström', subject: 'Idrott', codes: [...SUBJECTS.idrott] },
    { name: 'Jonas Lindqvist', subject: 'Idrott', codes: [...SUBJECTS.idrott] },

    // TEKNIK + PROGRAMMERING + GYMNASIEARBETE TE + INDVAL TE: 750p + 600p + 300p + 600p = 2250p → 4 lärare (563p snitt)
    { name: 'Magnus Hedlund', subject: 'Teknik, Programmering', codes: [...SUBJECTS.teknik, ...SUBJECTS.programmering, ...SUBJECTS.gymnasiearbeteTE, ...SUBJECTS.indvalTE] },
    { name: 'Robert Sundqvist', subject: 'Teknik, Programmering', codes: [...SUBJECTS.teknik, ...SUBJECTS.programmering, ...SUBJECTS.gymnasiearbeteTE, ...SUBJECTS.indvalTE] },
    { name: 'Viktor Sandberg', subject: 'Teknik, Programmering', codes: [...SUBJECTS.teknik, ...SUBJECTS.programmering, ...SUBJECTS.gymnasiearbeteTE, ...SUBJECTS.indvalTE] },
    { name: 'Caroline Gren', subject: 'Teknik, Programmering', codes: [...SUBJECTS.teknik, ...SUBJECTS.programmering, ...SUBJECTS.gymnasiearbeteTE, ...SUBJECTS.indvalTE] },
];

async function createTeachers() {
    console.log('=== TJÄNSTEFÖRDELNING 27 KLASSER ===\n');
    console.log('Läsår 2026/2027 | Max 600p per lärare\n');

    // Rensa befintliga lärare
    const existingTeachers = await db.select().from(teachers).where(eq(teachers.projectId, PROJECT_ID));
    if (existingTeachers.length > 0) {
        const teacherIds = existingTeachers.map(t => t.id);
        await db.delete(teacherServiceDistributions).where(inArray(teacherServiceDistributions.teacherId, teacherIds));
        await db.delete(teachers).where(inArray(teachers.id, teacherIds));
        console.log(`Tog bort ${existingTeachers.length} befintliga lärare\n`);
    }

    // Hämta klasser och nollställ kurstilldelningar
    const classes = await db.select().from(projectClasses).where(eq(projectClasses.projectId, PROJECT_ID));
    const classIds = classes.map(c => c.id);
    await db.update(courseInstances).set({ teacherId: null }).where(inArray(courseInstances.classId, classIds));

    // Skapa lärare
    const createdTeachers: Array<{ id: string; name: string; subject: string; codes: string[] }> = [];
    for (const t of TEACHERS) {
        const [created] = await db.insert(teachers).values({
            projectId: PROJECT_ID,
            name: t.name,
            subject: t.subject,
        }).returning();
        createdTeachers.push({ id: created.id, name: created.name, subject: t.subject, codes: t.codes });
    }
    console.log(`Skapade ${createdTeachers.length} lärare\n`);

    // Hämta alla kurser - men filtrera så att vi bara tilldelar kurser för läsåret 2026/2027
    // Varje klass har courses.year som anger vilket år kursen läses
    // Klassens årskurs bestäms av: 2026 - startYear + 1
    // Vi vill bara tilldela kurser där course.year === klassens årskurs för 2026/2027
    const allCoursesRaw = await db.select({
        course: courseInstances,
        classStartYear: projectClasses.startYear,
    }).from(courseInstances)
        .innerJoin(projectClasses, eq(courseInstances.classId, projectClasses.id))
        .where(inArray(courseInstances.classId, classIds));

    // Filtrera kurser för läsåret 2026/2027
    const allCourses = allCoursesRaw.filter(({ course, classStartYear }) => {
        const classYearLevel = 2026 - classStartYear + 1; // Klassens årskurs 2026/2027
        return course.year === classYearLevel;
    }).map(({ course }) => course);

    console.log(`Kurser att tilldela för läsår 2026/2027: ${allCourses.length}\n`);

    // Spåra lärarbelastning
    const teacherLoads = new Map<string, number>();
    for (const t of createdTeachers) {
        teacherLoads.set(t.id, 0);
    }

    // Tilldela kurser
    let assigned = 0;
    const warnings: string[] = [];

    for (const course of allCourses) {
        const eligible = createdTeachers.filter(t => t.codes.includes(course.courseCode));

        if (eligible.length === 0) {
            warnings.push(`Ingen lärare för ${course.courseCode}`);
            continue;
        }

        // Välj lärare med lägst belastning som kan ta kursen
        const available = eligible
            .map(t => ({ teacher: t, load: teacherLoads.get(t.id) || 0 }))
            .filter(t => t.load + course.points <= MAX_POINTS)
            .sort((a, b) => a.load - b.load);

        let selected: typeof eligible[0];
        if (available.length > 0) {
            selected = available[0].teacher;
        } else {
            // Alla över gräns - välj den med lägst belastning
            selected = eligible.reduce((best, curr) =>
                (teacherLoads.get(curr.id) || 0) < (teacherLoads.get(best.id) || 0) ? curr : best
            );
            const newLoad = (teacherLoads.get(selected.id) || 0) + course.points;
            if (newLoad > MAX_POINTS) {
                warnings.push(`${selected.name} överskrider 600p (${newLoad}p)`);
            }
        }

        await db.update(courseInstances).set({ teacherId: selected.id }).where(eq(courseInstances.id, course.id));
        teacherLoads.set(selected.id, (teacherLoads.get(selected.id) || 0) + course.points);
        assigned++;
    }

    // Skapa tjänstefördelningar
    for (const teacher of createdTeachers) {
        const load = teacherLoads.get(teacher.id) || 0;
        await db.insert(teacherServiceDistributions).values({
            teacherId: teacher.id,
            projectId: PROJECT_ID,
            academicYear: '2026/2027',
            servicePoints: MAX_POINTS,
            assignedPoints: load,
        });
    }

    // Resultat
    console.log('=== RESULTAT ===\n');
    console.log('Lärare'.padEnd(22) + 'Ämne'.padEnd(30) + 'Poäng'.padStart(6));
    console.log('─'.repeat(60));

    const results = createdTeachers
        .map(t => ({ ...t, load: teacherLoads.get(t.id) || 0 }))
        .sort((a, b) => b.load - a.load);

    let total = 0;
    let over600 = 0;
    let over550 = 0;

    for (const r of results) {
        const status = r.load > MAX_POINTS ? '!' : r.load >= 550 ? '✓' : ' ';
        console.log(`${status}${r.name.padEnd(21)} ${r.subject.padEnd(30)} ${String(r.load).padStart(4)}p`);
        total += r.load;
        if (r.load > MAX_POINTS) over600++;
        if (r.load >= 550) over550++;
    }

    console.log('─'.repeat(60));
    console.log(`${'TOTALT'.padEnd(53)} ${String(total).padStart(4)}p\n`);

    console.log('=== SAMMANFATTNING ===\n');
    console.log(`Lärare:              ${createdTeachers.length}`);
    console.log(`Kurser tilldelade:   ${assigned}`);
    console.log(`Totalt poäng:        ${total}p`);
    console.log(`Snitt per lärare:    ${Math.round(total / createdTeachers.length)}p`);
    console.log(`Lärare ≥550p:        ${over550} (${Math.round(over550 / createdTeachers.length * 100)}%)`);
    console.log(`Lärare över 600p:    ${over600}`);

    if (warnings.length > 0) {
        console.log('\n=== VARNINGAR ===\n');
        [...new Set(warnings)].forEach(w => console.log(`  - ${w}`));
    }

    process.exit(0);
}

createTeachers().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
