/**
 * Engångsscript: Sätter varje kursinstans year-fält till klassens beräknade
 * gymnasieår (2026 - startYear + 1), så att alla kurser matchar sin klass årskurs.
 */

import 'dotenv/config';
import { db } from '../src/db';
import { projectClasses, courseInstances } from '../src/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function fix() {
  const projectId = '88d52f1c-e2e3-4dd8-ad91-bfe843291295';
  const academicStartYear = 2026;

  const classes = await db.select().from(projectClasses).where(eq(projectClasses.projectId, projectId));
  const classIds = classes.map(c => c.id);
  const instances = await db.select().from(courseInstances).where(inArray(courseInstances.classId, classIds));

  console.log('Fixar kurser baserat på klassens gymnasieår...');

  // Map class to gymnasium year
  const classYearMap = new Map<string, number>();
  for (const cls of classes) {
    const gymnasiumYear = academicStartYear - cls.startYear + 1;
    classYearMap.set(cls.id, gymnasiumYear);
  }

  // Show class distribution
  const yearCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const [, year] of classYearMap) {
    yearCounts[year]++;
  }
  console.log('Klasser per gymnasieår:', yearCounts);

  // Update each course instance to match its class's gymnasium year
  let updated = 0;
  for (const inst of instances) {
    const gymnasiumYear = classYearMap.get(inst.classId);
    if (gymnasiumYear !== undefined && inst.year !== gymnasiumYear) {
      await db.update(courseInstances)
        .set({ year: gymnasiumYear })
        .where(eq(courseInstances.id, inst.id));
      updated++;
    }
  }

  console.log('Uppdaterade', updated, 'kursinstanser');

  // Verify
  const afterUpdate = await db.select().from(courseInstances).where(inArray(courseInstances.classId, classIds));
  const byYear: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const i of afterUpdate) {
    byYear[i.year] = (byYear[i.year] || 0) + 1;
  }
  console.log('Kursinstanser per år:', byYear);

  process.exit(0);
}

fix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
