import { db } from './index';
import { projectClasses, projects } from './schema';
import { eq } from 'drizzle-orm';

async function viewDatabase() {
    try {
        console.log('\n=== DATABASINNEHÅLL ===\n');

        // Get all projects (without relations API to avoid schema issues)
        const allProjects = await db.select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
            createdAt: projects.createdAt,
            updatedAt: projects.updatedAt,
        }).from(projects);

        console.log(`Totalt antal projekt: ${allProjects.length}\n`);

        for (const project of allProjects) {
            console.log(`📁 Projekt: ${project.name}`);
            console.log(`   ID: ${project.id}`);
            console.log(`   Skapad: ${project.createdAt}`);
            console.log(`   Uppdaterad: ${project.updatedAt}`);

            // Get classes for this project
            const classes = await db.select()
                .from(projectClasses)
                .where(eq(projectClasses.projectId, project.id));

            console.log(`   Antal klasser: ${classes.length}\n`);

            if (classes.length > 0) {
                for (const classItem of classes) {
                    console.log(`   📚 Klass: ${classItem.classCode}`);
                    console.log(`      Startår: ${classItem.startYear}`);
                    console.log(`      Examensår: ${classItem.graduationYear}`);
                    console.log(`      Program: ${classItem.programName} (${classItem.programCode})`);
                    console.log(`      Inriktning: ${classItem.orientationName} (${classItem.orientationCode})`);
                    console.log(`\n      📋 Kursplan:`);
                    console.log(`         Totalt poäng: ${classItem.totalPoints}`);
                    console.log(`         Giltig: ${classItem.isValid ? 'Ja' : 'Nej'}`);
                    console.log(`         Skapad: ${classItem.createdAt}`);
                    console.log('');
                }
            }
            console.log('─'.repeat(60) + '\n');
        }

    } catch (error) {
        console.error('Fel vid läsning av databas:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

viewDatabase();
