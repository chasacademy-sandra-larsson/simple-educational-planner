/**
 * Engångsscript: Lägger till ~74 extra lärare med svenska namn och ämneskombinationer
 * för att täcka kapacitetsgapet (67 500p behov vs 23 400p befintlig kapacitet).
 */

import 'dotenv/config';
import { db } from '../src/db';
import { teachers, projects } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Svenska förnamn och efternamn för realistiska lärare
const FIRST_NAMES = [
  'Anna', 'Erik', 'Maria', 'Johan', 'Sara', 'Anders', 'Emma', 'Magnus',
  'Karin', 'Peter', 'Linda', 'Lars', 'Eva', 'Thomas', 'Sofia', 'Henrik',
  'Kristina', 'Fredrik', 'Annika', 'Stefan', 'Helena', 'Niklas', 'Malin',
  'Jonas', 'Elin', 'Martin', 'Ingrid', 'David', 'Jenny', 'Mikael',
  'Louise', 'Björn', 'Cecilia', 'Daniel', 'Lena', 'Oscar', 'Ulrika',
  'Gustav', 'Petra', 'Viktor', 'Hanna', 'Robert', 'Johanna', 'Marcus',
  'Therese', 'Andreas', 'Camilla', 'Simon', 'Rebecca', 'Alexander',
  'Sandra', 'Christian', 'Ida', 'Mattias', 'Frida', 'Emil', 'Lisa',
  'Jakob', 'Caroline', 'Oskar', 'Amanda', 'Adam', 'Emelie', 'Lucas',
  'Olivia', 'William', 'Ella', 'Hugo', 'Alma', 'Liam', 'Ebba', 'Noah',
  'Agnes', 'Oliver', 'Maja', 'Elias', 'Saga', 'Filip', 'Vera'
];

const LAST_NAMES = [
  'Johansson', 'Eriksson', 'Karlsson', 'Nilsson', 'Larsson', 'Olsson',
  'Persson', 'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson',
  'Hansson', 'Bengtsson', 'Jönsson', 'Lindberg', 'Lindström', 'Lindgren',
  'Axelsson', 'Berg', 'Bergström', 'Lundberg', 'Lindqvist', 'Mattsson',
  'Berglund', 'Fredriksson', 'Sandberg', 'Henriksson', 'Forsberg', 'Sjöberg',
  'Wallin', 'Engström', 'Eklund', 'Danielsson', 'Lundin', 'Håkansson',
  'Björk', 'Bergman', 'Gunnarsson', 'Holm', 'Wikström', 'Samuelsson',
  'Fransson', 'Isaksson', 'Bergqvist', 'Nyström', 'Holmberg', 'Arvidsson',
  'Löfgren', 'Söderberg', 'Nyberg', 'Blomqvist', 'Claesson', 'Nordström'
];

// Lärarbehov per ämne baserat på tidigare analys
const TEACHER_NEEDS = [
  { subjects: 'Engelska, Moderna språk', count: 13 },
  { subjects: 'Svenska, Historia', count: 9 },
  { subjects: 'Biologi, Naturkunskap', count: 6 },
  { subjects: 'Matematik, Fysik', count: 4 },
  { subjects: 'Kemi, Biologi, Naturkunskap', count: 4 },
  { subjects: 'Idrott', count: 3 },
  { subjects: 'Fysik, Teknik', count: 2 },
  { subjects: 'Samhällskunskap, Historia, Geografi', count: 1 },
  { subjects: 'Svenska, Religion, Filosofi', count: 3 },
  { subjects: 'Matematik, Programmering', count: 3 },
  { subjects: 'Teknik, Programmering, Matematik', count: 2 },
  { subjects: 'Historia, Religion', count: 2 },
  { subjects: 'Samhällskunskap, Religion, Psykologi', count: 2 },
  { subjects: 'Gymnasiearbete, Individuellt val, Teknik', count: 3 },
  { subjects: 'Gymnasiearbete, Individuellt val, Naturkunskap', count: 3 },
  { subjects: 'Gymnasiearbete, Individuellt val, Samhällskunskap', count: 3 },
  { subjects: 'Geografi, Samhällskunskap', count: 2 },
  { subjects: 'Psykologi, Religion', count: 2 },
  { subjects: 'Filosofi, Religion', count: 2 },
  { subjects: 'Moderna språk, Engelska', count: 5 },
];

let nameIndex = 0;
const usedNames = new Set<string>();

function generateUniqueName(): { firstName: string; lastName: string; fullName: string } {
  let attempts = 0;
  while (attempts < 1000) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const fullName = `${firstName} ${lastName}`;

    if (!usedNames.has(fullName)) {
      usedNames.add(fullName);
      return { firstName, lastName, fullName };
    }
    attempts++;
  }

  // Fallback med nummer
  nameIndex++;
  const firstName = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
  const lastName = LAST_NAMES[nameIndex % LAST_NAMES.length];
  const fullName = `${firstName} ${lastName} ${nameIndex}`;
  return { firstName, lastName, fullName };
}

async function addTeachers() {
  console.log('🎓 Lägger till lärare för att täcka undervisningsbehovet...\n');

  // Hitta projektet "Gymnasium 27 Klasser"
  const [project] = await db.select().from(projects).where(eq(projects.name, 'Gymnasium 27 Klasser')).limit(1);

  if (!project) {
    console.error('❌ Inget projekt hittades!');
    return;
  }

  console.log(`📁 Projekt: ${project.name}`);

  // Hämta befintliga lärare för att undvika dubbletter
  const existingTeachers = await db.select().from(teachers).where(eq(teachers.projectId, project.id));
  existingTeachers.forEach(t => usedNames.add(t.name));

  console.log(`👩‍🏫 Befintliga lärare: ${existingTeachers.length}`);

  let addedCount = 0;
  const newTeachers: { name: string; subject: string; email: string }[] = [];

  for (const need of TEACHER_NEEDS) {
    for (let i = 0; i < need.count; i++) {
      const { fullName, firstName, lastName } = generateUniqueName();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@skola.se`;

      newTeachers.push({
        name: fullName,
        subject: need.subjects,
        email
      });
      addedCount++;
    }
  }

  // Lägg till i databasen
  if (newTeachers.length > 0) {
    await db.insert(teachers).values(
      newTeachers.map(t => ({
        projectId: project.id,
        name: t.name,
        subject: t.subject,
        email: t.email,
      }))
    );
  }

  console.log(`\n✅ Lade till ${addedCount} nya lärare`);

  // Visa sammanfattning per ämne
  console.log('\n📊 Nya lärare per ämne:');
  for (const need of TEACHER_NEEDS) {
    console.log(`   ${need.subjects}: +${need.count}`);
  }

  // Visa ny total
  const totalTeachers = existingTeachers.length + addedCount;
  const totalCapacity = totalTeachers * 600;

  console.log('\n📈 Ny kapacitet:');
  console.log(`   Totalt antal lärare: ${totalTeachers}`);
  console.log(`   Total kapacitet: ${totalCapacity.toLocaleString()}p`);
  console.log(`   Behov: 67,500p`);
  console.log(`   ${totalCapacity >= 67500 ? '✅ Tillräcklig kapacitet!' : '⚠️ Fortfarande underskott'}`);
}

addTeachers().catch(console.error);
