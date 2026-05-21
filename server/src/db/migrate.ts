import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrationClient } from './index';
import * as schema from './schema';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    console.log('Running migrations...');

    const db = drizzle(migrationClient, { schema });

    // Resolve migrations folder path relative to the server directory
    const migrationsFolder = path.join(__dirname, '../../drizzle');

    await migrate(db, { migrationsFolder });

    console.log('Migrations completed!');
    process.exit(0);
}

runMigrations().catch((err) => {
    console.error('Migration failed!', err);
    process.exit(1);
});
