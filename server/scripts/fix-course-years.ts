/**
 * Engångsscript: Sätter korrekt årskurs (1–3) på kursinstanser baserat på kurskod.
 * Använder en explicit mappning (COURSE_YEAR_MAP) plus mönstermatchning som fallback.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { courseInstances, projectClasses } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

// Map course codes to their correct year
function getCourseYear(courseCode: string, courseName: string): number {
    const code = courseCode.toUpperCase();

    // Year 1 courses
    if (code.includes('01') || code.includes('05') || code.endsWith('1A') || code.endsWith('1B') ||
        code.includes('01A') || code.includes('01B') || code.includes('01C') ||
        code === 'NAKNAK00S') {
        // Exception: 01a2 is year 2
        if (code.includes('01A2')) return 2;
        if (code.includes('01B') && !code.includes('01B1')) return 1; // SAM01b, HIS01b is year 1
        return 1;
    }

    // Year 2 courses
    if (code.includes('02') || code.includes('06') || code.endsWith('2A') || code.endsWith('2B') ||
        code.includes('02A') || code.includes('02B') || code.includes('02C')) {
        // Exception: Religionskunskap 2 is year 2
        // HIS02b is year 2
        return 2;
    }

    // Year 3 courses
    if (code.includes('03') || code.includes('04') || code.includes('07') ||
        code.startsWith('EXA') || code.startsWith('IND') ||
        code.includes('03A') || code.includes('03B') || code.includes('03C')) {
        return 3;
    }

    // Fallback based on course name patterns
    const name = courseName.toLowerCase();
    if (name.includes('1') && !name.includes('2') && !name.includes('3')) return 1;
    if (name.includes('2') && !name.includes('3')) return 2;
    if (name.includes('3') || name.includes('4')) return 3;
    if (name.includes('gymnasiearbete') || name.includes('individuellt val')) return 3;

    // Default to year 1 if unclear
    console.log(`  ⚠️ Oklart år för: ${courseCode} - ${courseName}, sätter år 1`);
    return 1;
}

// Better mapping based on the actual COURSES definitions
const COURSE_YEAR_MAP: Record<string, number> = {
    // Year 1 TE
    'SVESVE01': 1, 'ENGENG05': 1, 'MATMAT01C': 1, 'IDHIDH01': 1, 'HISHIS01A1': 1,
    'FYSFYS01A': 1, 'KEMKEM01': 1, 'TEKTEK01': 1,
    // Year 2 TE
    'SVESVE02': 2, 'ENGENG06': 2, 'MATMAT02C': 2, 'HISHIS01A2': 2, 'SAMSAM01B': 2,
    'RELREL01': 2, 'FYSFYS02': 2, 'TEKTEK02': 2, 'PRRPRR01': 2, 'KEMKEM02': 2,
    // Year 3 TE
    'SVESVE03': 3, 'ENGENG07': 3, 'MATMAT03C': 3, 'FYSFYS03': 3, 'PRRPRR02': 3,
    'EXAEXMTE': 3, 'INDTE01': 3, 'INDTE02': 3,

    // Year 1 NA
    'BIOBIO01': 1, 'NAKNAK00S': 1,
    // Year 2 NA
    'MATMAT03C_NA': 2, 'BIOBIO02': 2,
    // Year 3 NA
    'MATMAT04': 3, 'KEMKEM03': 3, 'BIOBIO03': 3, 'EXAEXMNA': 3, 'INDNA01': 3, 'INDNA02': 3,

    // Year 1 SA
    'MATMAT01B': 1, 'HISHIS01B': 1, 'GEOGEO01': 1, 'MODSPR01': 1,
    // Year 2 SA
    'MATMAT02B': 2, 'NAKNAF01B': 2, 'HISHIS02B': 2, 'SAMSAM02': 2, 'RELREL02': 2,
    'PSYPSY01': 2, 'MODSPR02': 2, 'GEOGEO02': 2,
    // Year 3 SA
    'SAMSAM03': 3, 'PSYPSY02A': 3, 'MODSPR03': 3, 'FILFIL01': 3, 'EXAEXMSA': 3,
    'INDSA01': 3, 'INDSA02': 3,
};

function getCorrectYear(courseCode: string, courseName: string): number {
    const upperCode = courseCode.toUpperCase();

    // Check exact match first
    if (COURSE_YEAR_MAP[upperCode]) {
        return COURSE_YEAR_MAP[upperCode];
    }

    // Try without variant letters
    const baseCode = upperCode.replace(/[ABC]$/, '');
    if (COURSE_YEAR_MAP[baseCode]) {
        return COURSE_YEAR_MAP[baseCode];
    }

    // Fallback to pattern matching
    return getCourseYear(courseCode, courseName);
}

async function fixCourseYears() {
    console.log('=== FIXAR KURSINSTANSERS ÅRSKURS ===\n');

    // Get all classes
    const classes = await db.select().from(projectClasses);
    console.log(`Antal klasser: ${classes.length}`);

    // Get all course instances
    const instances = await db.select().from(courseInstances);
    console.log(`Antal kursinstanser: ${instances.length}`);

    // Count changes
    let updated = 0;
    let unchanged = 0;
    const yearCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

    for (const instance of instances) {
        const correctYear = getCorrectYear(instance.courseCode, instance.courseName);
        yearCounts[correctYear]++;

        if (instance.year !== correctYear) {
            await db.update(courseInstances)
                .set({ year: correctYear })
                .where(eq(courseInstances.id, instance.id));
            updated++;
        } else {
            unchanged++;
        }
    }

    console.log(`\n✅ Uppdaterade: ${updated} kursinstanser`);
    console.log(`   Oförändrade: ${unchanged} kursinstanser`);
    console.log(`\nFördelning per år:`);
    console.log(`   År 1: ${yearCounts[1]} kurser`);
    console.log(`   År 2: ${yearCounts[2]} kurser`);
    console.log(`   År 3: ${yearCounts[3]} kurser`);

    process.exit(0);
}

fixCourseYears().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
