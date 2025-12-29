import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set. Make sure you have a .env file in the server directory.');
}

// Log connection string (without password) for debugging
const maskedUrl = connectionString.replace(/:[^:@]+@/, ':****@');
console.log('🔌 Database connection:', maskedUrl);

// For query purposes - disable prepared statements to avoid cache issues
export const queryClient = postgres(connectionString, {
    prepare: false, // Disable prepared statements to avoid schema cache issues
});
export const db = drizzle(queryClient, { schema });

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });
