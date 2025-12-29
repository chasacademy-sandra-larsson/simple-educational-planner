import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { max: 1 });

async function checkColumns() {
    try {
        console.log('\n=== Checking columns in projects table ===\n');

        const columns = await sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'projects'
            AND table_schema = 'public'
            ORDER BY ordinal_position;
        `;

        console.log('Current columns in projects table:');
        columns.forEach((col: any) => {
            console.log(`  - ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
        });

        const expectedColumns = [
            'earliest_lesson_start',
            'latest_lesson_end',
            'default_lesson_duration',
            'mentor_time_per_week',
            'lunch_duration',
            'earliest_lunch_time',
            'latest_lunch_time',
            'shortest_break_between_lessons',
            'longest_break_between_lessons'
        ];

        console.log('\n=== Checking for missing time-related columns ===\n');
        const existingColumnNames = columns.map((col: any) => col.column_name);
        const missingColumns = expectedColumns.filter(col => !existingColumnNames.includes(col));

        if (missingColumns.length === 0) {
            console.log('✅ All time-related columns exist!');
        } else {
            console.log('❌ Missing columns:');
            missingColumns.forEach(col => console.log(`  - ${col}`));
            console.log('\nRun: npm run db:add-time-columns');
        }

    } catch (error) {
        console.error('❌ Error checking columns:', error);
        throw error;
    } finally {
        await sql.end();
        process.exit(0);
    }
}

checkColumns();

