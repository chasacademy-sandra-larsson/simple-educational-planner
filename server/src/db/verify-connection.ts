import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

console.log('DATABASE_URL:', connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password

const sql = postgres(connectionString, { max: 1 });

async function verifyConnection() {
    try {
        console.log('\n=== Verifying Database Connection ===\n');

        // Get current database name
        const dbResult = await sql`SELECT current_database() as db_name`;
        console.log('Connected to database:', dbResult[0].db_name);

        // Get current schema
        const schemaResult = await sql`SELECT current_schema() as schema_name`;
        console.log('Current schema:', schemaResult[0].schema_name);

        // Check if users table exists
        const tableCheck = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            ) as users_exists
        `;
        console.log('Users table exists:', tableCheck[0].users_exists);

        // Check if projects table exists
        const projectsCheck = await sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'projects'
            ) as projects_exists
        `;
        console.log('Projects table exists:', projectsCheck[0].projects_exists);

        // Count users
        const userCount = await sql`SELECT COUNT(*) as count FROM users`;
        console.log('Number of users:', userCount[0].count);

        // Check projects table columns
        const columns = await sql`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'projects'
            AND table_schema = 'public'
            AND (column_name LIKE '%lesson%' OR column_name LIKE '%lunch%' OR column_name LIKE '%break%' OR column_name LIKE '%mentor%')
            ORDER BY column_name
        `;
        console.log('\nTime-related columns in projects:');
        if (columns.length === 0) {
            console.log('  (none found)');
        } else {
            columns.forEach((col: any) => {
                console.log(`  - ${col.column_name} (${col.data_type})`);
            });
        }

        // List all users
        const users = await sql`SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 5`;
        console.log('\nRecent users (last 5):');
        if (users.length === 0) {
            console.log('  (no users found)');
        } else {
            users.forEach((user: any) => {
                console.log(`  - ${user.email} (${user.name}) - Created: ${user.created_at}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await sql.end();
        process.exit(0);
    }
}

verifyConnection();

