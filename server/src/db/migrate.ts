import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrationClient } from './index';
import * as schema from './schema';

async function runMigrations() {
    console.log('Running migrations...');

    const db = drizzle(migrationClient, { schema });

    await migrate(db, { migrationsFolder: './drizzle' });

    console.log('Migrations completed!');
    process.exit(0);
}

runMigrations().catch((err) => {
    console.error('Migration failed!', err);
    process.exit(1);
});
