import { db } from './index';
import { classCurricula, projectClasses, projects, projectPrograms } from './schema';
import { eq } from 'drizzle-orm';

async function viewDatabase() {
    try {
        console.log('\n=== DATABASINNEHÅLL ===\n');

        // Get all projects
        const allProjects = await db.query.projects.findMany({
            with: {
                classes: {
                    with: {
                        program: true,
                        curricula: true,
                    },
                },
            },
        });

        console.log(`Totalt antal projekt: ${allProjects.length}\n`);

        for (const project of allProjects) {
            console.log(`📁 Projekt: ${project.name}`);
            console.log(`   ID: ${project.id}`);
            console.log(`   Skapad: ${project.createdAt}`);
            console.log(`   Uppdaterad: ${project.updatedAt}`);
            console.log(`   Antal klasser: ${project.classes?.length || 0}\n`);

            if (project.classes && project.classes.length > 0) {
                for (const classItem of project.classes) {
                    console.log(`   📚 Klass: ${classItem.classCode}`);
                    console.log(`      Startår: ${classItem.startYear}`);
                    console.log(`      Examensår: ${classItem.graduationYear}`);
                    console.log(`      Program: ${classItem.program?.programName} (${classItem.program?.programCode})`);
                    console.log(`      Inriktning: ${classItem.program?.orientationName} (${classItem.program?.orientationCode})`);

                    if (classItem.curricula && classItem.curricula.length > 0) {
                        for (const curriculum of classItem.curricula) {
                            console.log(`\n      📋 Kursplan:`);
                            console.log(`         Totalt poäng: ${curriculum.totalPoints}`);
                            console.log(`         Giltig: ${curriculum.isValid ? 'Ja' : 'Nej'}`);
                            console.log(`         Antal kurser: ${Array.isArray(curriculum.courses) ? curriculum.courses.length : 0}`);
                            console.log(`         Skapad: ${curriculum.createdAt}`);
                            console.log(`         Uppdaterad: ${curriculum.updatedAt}`);

                            if (Array.isArray(curriculum.courses) && curriculum.courses.length > 0) {
                                console.log(`\n         Kurser:`);
                                curriculum.courses.forEach((course: any, index: number) => {
                                    console.log(`            ${index + 1}. ${course.courseName || course.courseCode}`);
                                    console.log(`               Kurskod: ${course.courseCode}`);
                                    console.log(`               Poäng: ${course.points}`);
                                    console.log(`               Kategori: ${course.category}`);
                                    console.log(`               År: ${course.year || 'Ej angivet'}`);
                                });
                            }
                        }
                    } else {
                        console.log(`      (Ingen kursplan sparad än)`);
                    }
                    console.log('');
                }
            }
            console.log('─'.repeat(60) + '\n');
        }

        // Get all curricula directly
        const allCurricula = await db.query.classCurricula.findMany();
        console.log(`\nTotalt antal kursplaner: ${allCurricula.length}\n`);

    } catch (error) {
        console.error('Fel vid läsning av databas:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

viewDatabase();


