/**
 * Engångsscript: Tilldelar mentorskap jämnt bland lärare med round-robin-fördelning.
 * Rensar befintliga mentorskap och skapar nya för projektet "Gymnasium 27 Klasser".
 */

import 'dotenv/config';
import { db } from '../src/db';
import { teachers, projectClasses, projects, classMentors } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function assignMentors() {
  console.log('🎓 Tilldelar mentorskap jämnt...\n');

  const [project] = await db.select().from(projects)
    .where(eq(projects.name, 'Gymnasium 27 Klasser')).limit(1);

  if (!project) {
    console.error('❌ Projekt hittades inte');
    return;
  }

  // Hämta alla klasser för projektet
  const allClasses = await db.select().from(projectClasses)
    .where(eq(projectClasses.projectId, project.id));

  // Hämta alla lärare för projektet
  const allTeachers = await db.select().from(teachers)
    .where(eq(teachers.projectId, project.id));

  console.log('📊 Statistik:');
  console.log(`   Antal klasser: ${allClasses.length}`);
  console.log(`   Antal lärare: ${allTeachers.length}`);
  console.log(`   Klasser per lärare: ${(allClasses.length / allTeachers.length).toFixed(1)}`);
  console.log('');

  // Rensa befintliga mentorskap
  await db.delete(classMentors);
  console.log('🔄 Rensade befintliga mentorskap\n');

  // Fördela klasser jämnt - round-robin style
  const assignments: { classId: string; teacherId: string; className: string; teacherName: string }[] = [];

  for (let i = 0; i < allClasses.length; i++) {
    const cls = allClasses[i];
    const teacher = allTeachers[i % allTeachers.length];

    await db.insert(classMentors).values({
      classId: cls.id,
      teacherId: teacher.id,
      isPrimary: 1 // 1 = primary mentor
    });

    assignments.push({
      classId: cls.id,
      teacherId: teacher.id,
      className: cls.classCode,
      teacherName: teacher.name
    });
  }

  console.log(`✅ Mentorskap tilldelade: ${assignments.length}`);
  console.log('');

  // Visa fördelning
  const teacherMentorCount: Record<string, { name: string; count: number; classes: string[] }> = {};
  assignments.forEach(a => {
    if (!teacherMentorCount[a.teacherId]) {
      teacherMentorCount[a.teacherId] = { name: a.teacherName, count: 0, classes: [] };
    }
    teacherMentorCount[a.teacherId].count++;
    teacherMentorCount[a.teacherId].classes.push(a.className);
  });

  console.log('👩‍🏫 Mentorfördelning:');
  Object.values(teacherMentorCount)
    .sort((a, b) => b.count - a.count)
    .forEach(t => {
      console.log(`   ${t.name}: ${t.count} klass(er) - ${t.classes.join(', ')}`);
    });
}

assignMentors().catch(console.error);
