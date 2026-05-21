import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const sql = postgres(connectionString, { max: 1, prepare: false });

async function resetDatabase() {
    try {
        console.log('🗑️  Resetting database...\n');

        // Get all table names in the public schema
        const tables = await sql`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        `;

        if (tables.length === 0) {
            console.log('✅ No tables found. Database is already empty.');
            return;
        }

        console.log(`📋 Found ${tables.length} tables to drop:`);
        tables.forEach(t => console.log(`   - ${t.tablename}`));

        // Drop all tables with CASCADE to handle foreign key constraints
        for (const table of tables) {
            await sql.unsafe(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
            console.log(`   ✅ Dropped ${table.tablename}`);
        }

        // Also drop the drizzle migrations table if it exists
        await sql.unsafe(`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE`);
        console.log('   ✅ Dropped __drizzle_migrations');

        console.log('\n✅ Database reset completed!');
        console.log('📝 Next steps:');
        console.log('   1. Run: npm run db:generate');
        console.log('   2. Run: npm run db:migrate');
        console.log('   3. (Optional) Run: npm run db:seed');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        throw error;
    } finally {
        await sql.end();
    }
}

resetDatabase();