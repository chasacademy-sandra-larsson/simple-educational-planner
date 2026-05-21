/**
 * Engångsscript: Fixar felaktiga term-värden (t.ex. 'termterm...') genom att
 * nollställa alla kursinstansers termer till ['HT', 'VT'].
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projectClasses, courseInstances } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function fix() {
    const projectId = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';

    const classes = await db.select().from(projectClasses).where(eq(projectClasses.projectId, projectId));
    const classIds = classes.map(c => c.id);
    const instances = await db.select().from(courseInstances).where(inArray(courseInstances.classId, classIds));

    console.log('Fixing terms for', instances.length, 'course instances...');

    let updated = 0;
    for (const inst of instances) {
        const terms = inst.terms as string[];
        const needsFix = terms.some(t => t.includes('termterm') || (t.startsWith('term') && t !== 'HT' && t !== 'VT'));

        if (needsFix) {
            // Reset terms to the correct format: ['HT', 'VT']
            await db.update(courseInstances)
                .set({ terms: ['HT', 'VT'] })
                .where(eq(courseInstances.id, inst.id));
            updated++;
        }
    }

    console.log('Fixed', updated, 'course instances');

    // Verify
    const afterFix = await db.select().from(courseInstances).where(inArray(courseInstances.classId, classIds)).limit(5);
    console.log('\nSample terms after fix:');
    for (const inst of afterFix) {
        console.log('  ', inst.courseCode, ':', inst.terms);
    }

    process.exit(0);
}

fix().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
