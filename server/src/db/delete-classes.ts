import 'dotenv/config';
import { db } from './index';
import { projectClasses, projects, users } from './schema';
import { eq, and, inArray } from 'drizzle-orm';

async function deleteClasses() {
    try {
        // Get class codes from command line arguments or use defaults
        const classCodesToDelete = process.argv.slice(2);
        
        if (classCodesToDelete.length === 0) {
            console.log('❌ Please provide class codes to delete.');
            console.log('Usage: tsx src/db/delete-classes.ts <classCode1> <classCode2> ...');
            console.log('Example: tsx src/db/delete-classes.ts 26TEKA 26TEKD');
            process.exit(1);
        }

        console.log(`🗑️  Starting deletion of classes: ${classCodesToDelete.join(', ')}`);

        // Find the seed user
        const defaultEmail = 'admin@example.com';
        const user = await db.query.users.findFirst({
            where: eq(users.email, defaultEmail),
        });

        if (!user) {
            console.log('❌ Seed user not found.');
            return;
        }

        // Find the seed project
        const projectName = 'Teknikprogrammet - Seed Projekt';
        const project = await db.query.projects.findFirst({
            where: and(
                eq(projects.userId, user.id),
                eq(projects.name, projectName)
            ),
        });

        if (!project) {
            console.log('❌ Seed project not found.');
            return;
        }

        // Find classes to delete
        const classes = await db.query.projectClasses.findMany({
            where: and(
                eq(projectClasses.projectId, project.id),
                inArray(projectClasses.classCode, classCodesToDelete)
            ),
        });

        if (classes.length === 0) {
            console.log('✅ No matching classes found.');
            return;
        }

        console.log(`\n📚 Found ${classes.length} classes to delete:`);
        classes.forEach(c => {
            console.log(`   - ${c.classCode} (${c.startYear}-${c.graduationYear})`);
        });

        // Delete the classes
        const classIds = classes.map(c => c.id);
        await db.delete(projectClasses).where(inArray(projectClasses.id, classIds));

        console.log(`\n✅ Successfully deleted ${classes.length} classes!`);
        
    } catch (error) {
        console.error('❌ Error deleting classes:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

deleteClasses();







