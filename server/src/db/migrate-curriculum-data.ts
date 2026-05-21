import 'dotenv/config';
import postgres from 'postgres';
import { db } from './index';
import { classCurricula, courseInstances, projectClasses } from './schema';
import { eq } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const sql = postgres(connectionString, { max: 1, prepare: false });

async function migrateCurriculumData() {
    try {
        console.log('🔄 Migrating curriculum data...\n');

        // Get all classes that have course instances but no curriculum
        const classesWithCourses = await sql`
            SELECT DISTINCT ci.class_id, pc.id as class_id
            FROM course_instances ci
            JOIN project_classes pc ON ci.class_id = pc.id
            WHERE NOT EXISTS (
                SELECT 1 FROM class_curricula cc WHERE cc.class_id = ci.class_id
            )
            GROUP BY ci.class_id, pc.id
        `;

        console.log(`📋 Found ${classesWithCourses.length} classes with course instances but no curriculum\n`);

        for (const classRow of classesWithCourses) {
            const classId = classRow.class_id;

            // Get all course instances for this class
            const instances = await db.select()
                .from(courseInstances)
                .where(eq(courseInstances.classId, classId));

            if (instances.length === 0) {
                console.log(`⏭️  Skipping class ${classId} - no course instances`);
                continue;
            }

            // Calculate total points
            const totalPoints = instances.reduce((sum, ci) => sum + ci.points, 0);
            const isValid = totalPoints === 2500 ? 1 : 0;

            // Create curriculum
            const [curriculum] = await db.insert(classCurricula).values({
                classId: classId,
                totalPoints,
                isValid,
                status: 'draft',
                version: 1,
            }).returning();

            console.log(`✅ Created curriculum ${curriculum.id} for class ${classId} (${instances.length} courses, ${totalPoints} points)`);

            // Update course instances to link to curriculum
            // Note: We need to update them one by one since we can't update with a subquery easily in Drizzle
            for (const instance of instances) {
                await db.update(courseInstances)
                    .set({ curriculumId: curriculum.id })
                    .where(eq(courseInstances.id, instance.id));
            }

            console.log(`   ✅ Updated ${instances.length} course instances to link to curriculum\n`);
        }

        // Check for any orphaned course instances (shouldn't happen, but just in case)
        const orphanedInstances = await sql`
            SELECT COUNT(*) as count
            FROM course_instances ci
            WHERE ci.curriculum_id IS NULL
        `;

        if (orphanedInstances[0].count > 0) {
            console.log(`⚠️  Warning: Found ${orphanedInstances[0].count} course instances without curriculum_id`);
            console.log('   These will need to be handled manually or deleted.\n');
        }

        console.log('✅ Migration completed!');

    } catch (error) {
        console.error('❌ Error migrating curriculum data:', error);
        throw error;
    } finally {
        await sql.end();
    }
}

migrateCurriculumData();

