import 'dotenv/config';
import { db } from './index';
import { projectClasses, projects, users } from './schema';
import { eq, and, inArray } from 'drizzle-orm';

async function deleteSeedClasses() {
    try {
        console.log('🗑️  Starting deletion of seed classes...');

        // Find the seed user
        const defaultEmail = 'admin@example.com';
        const user = await db.query.users.findFirst({
            where: eq(users.email, defaultEmail),
        });

        if (!user) {
            console.log('❌ Seed user not found. Nothing to delete.');
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
            console.log('❌ Seed project not found. Nothing to delete.');
            return;
        }

        // Find all classes in the seed project
        const classes = await db.query.projectClasses.findMany({
            where: eq(projectClasses.projectId, project.id),
        });

        if (classes.length === 0) {
            console.log('✅ No classes found in seed project.');
            return;
        }

        console.log(`\n📚 Found ${classes.length} classes to delete:`);
        classes.forEach(c => {
            console.log(`   - ${c.classCode} (${c.startYear}-${c.graduationYear})`);
        });

        // Delete all classes
        const classIds = classes.map(c => c.id);
        await db.delete(projectClasses).where(inArray(projectClasses.id, classIds));

        console.log(`\n✅ Successfully deleted ${classes.length} classes!`);
        
    } catch (error) {
        console.error('❌ Error deleting seed classes:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

deleteSeedClasses();







