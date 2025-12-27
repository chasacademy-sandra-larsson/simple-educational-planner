import 'dotenv/config';
import { db } from './index';
import { projects, projectClasses, users } from './schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');

        // Create or find a default user for the seed project
        const defaultEmail = 'admin@example.com';
        const defaultPassword = 'admin123';
        
        let user = await db.query.users.findFirst({
            where: eq(users.email, defaultEmail),
        });

        if (!user) {
            const passwordHash = await bcrypt.hash(defaultPassword, 10);
            const [newUser] = await db.insert(users).values({
                email: defaultEmail,
                name: 'Admin User',
                passwordHash,
            }).returning();
            user = newUser;
            console.log('✅ Created default user:', defaultEmail);
        } else {
            console.log('✅ Found existing user:', defaultEmail);
        }

        // Create a seed project
        const projectName = 'Teknikprogrammet - Seed Projekt';
        let project = await db.query.projects.findFirst({
            where: and(
                eq(projects.userId, user.id),
                eq(projects.name, projectName)
            ),
        });

        if (!project) {
            const [newProject] = await db.insert(projects).values({
                userId: user.id,
                name: projectName,
                description: 'Seed-projekt med 4 teknikklasser',
            }).returning();
            project = newProject;
            console.log('✅ Created project:', projectName);
        } else {
            console.log('✅ Found existing project:', projectName);
            // Check if we already have 5 classes
            const existingClasses = await db.query.projectClasses.findMany({
                where: eq(projectClasses.projectId, project.id),
            });
            if (existingClasses.length >= 4) {
                console.log(`⚠️  Project already has ${existingClasses.length} classes. Skipping seed.`);
                console.log('💡 To reseed, delete the existing classes first.');
                return;
            }
        }

        // Program information for the classes
        const programCode = 'TE';
        const programName = 'Teknikprogrammet';
        const orientationCode = 'TEKTEK';
        const orientationName = 'Teknik';

        // Create 4 teknikklasser all starting in 2026
        const classesToCreate = [
            { classCode: '26TEKA', startYear: 2026 },
            { classCode: '26TEKB', startYear: 2026 },
            { classCode: '26TEKC', startYear: 2026 },
            { classCode: '26TEKD', startYear: 2026 },
        ];

        console.log('\n📚 Creating classes...');
        let createdCount = 0;
        let skippedCount = 0;

        for (const classData of classesToCreate) {
            // Check if class already exists in this project
            const existingClass = await db.query.projectClasses.findFirst({
                where: and(
                    eq(projectClasses.projectId, project.id),
                    eq(projectClasses.classCode, classData.classCode)
                ),
            });

            if (existingClass) {
                console.log(`⏭️  Skipping ${classData.classCode} (already exists)`);
                skippedCount++;
                continue;
            }

            const graduationYear = classData.startYear + 3;

            const [newClass] = await db.insert(projectClasses).values({
                projectId: project.id,
                classCode: classData.classCode,
                programCode,
                programName,
                orientationCode,
                orientationName,
                startYear: classData.startYear,
                graduationYear,
            }).returning();

            console.log(`✅ Created class: ${classData.classCode} (${classData.startYear}-${graduationYear})`);
            createdCount++;
        }

        console.log(`\n✨ Seeding complete!`);
        console.log(`   - Created: ${createdCount} classes`);
        console.log(`   - Skipped: ${skippedCount} classes (already existed)`);
        console.log(`   - Project ID: ${project.id}`);
        console.log(`   - User: ${user.email}`);
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

seedDatabase();

