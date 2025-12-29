import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { max: 1 });

async function addTimeColumns() {
    try {
        console.log('Adding time settings columns to projects table...');

        await sql`
            ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "earliest_lesson_start" time;
        `;
        console.log('✅ Added earliest_lesson_start');

        await sql`
            ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "latest_lesson_end" time;
        `;
        console.log('✅ Added latest_lesson_end');

        await sql`
            ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "default_lesson_duration" integer;
        `;
        console.log('✅ Added default_lesson_duration');

        await sql`
            ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "mentor_time_per_week" integer;
        `;
        console.log('✅ Added mentor_time_per_week');

        await sql`
            ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "lunch_duration" integer;
        `;
        console.log('✅ Added lunch_duration');

        await sql`
            ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "earliest_lunch_time" time;
        `;
        console.log('✅ Added earliest_lunch_time');

        await sql`
            ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "latest_lunch_time" time;
        `;
        console.log('✅ Added latest_lunch_time');

        await sql`
            ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "shortest_break_between_lessons" integer;
        `;
        console.log('✅ Added shortest_break_between_lessons');

        await sql`
            ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "longest_break_between_lessons" integer;
        `;
        console.log('✅ Added longest_break_between_lessons');

        console.log('\n✅ All time settings columns added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding time columns:', error);
        throw error;
    } finally {
        await sql.end();
        process.exit(0);
    }
}

addTimeColumns();

