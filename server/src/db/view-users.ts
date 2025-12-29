import 'dotenv/config';
import { db, queryClient } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';

async function viewUsers() {
    try {
        console.log('\n=== ANVÄNDARE I DATABASEN ===\n');

        // Method 1: Drizzle query
        console.log('📊 Metod 1: Drizzle Query');
        const drizzleUsers = await db.select().from(users);
        console.log(`Antal användare (Drizzle): ${drizzleUsers.length}`);
        drizzleUsers.forEach((user, index) => {
            console.log(`\n  ${index + 1}. ${user.name} (${user.email})`);
            console.log(`     ID: ${user.id}`);
            console.log(`     Skapad: ${user.createdAt}`);
        });

        // Method 2: Raw SQL query
        console.log('\n\n📊 Metod 2: Raw SQL Query');
        const rawUsers = await queryClient`
            SELECT id, email, name, created_at
            FROM users
            ORDER BY created_at DESC
        `;
        console.log(`Antal användare (Raw SQL): ${rawUsers.length}`);
        rawUsers.forEach((user: any, index: number) => {
            console.log(`\n  ${index + 1}. ${user.name} (${user.email})`);
            console.log(`     ID: ${user.id}`);
            console.log(`     Skapad: ${user.created_at}`);
        });

        // Method 3: Count query
        console.log('\n\n📊 Metod 3: COUNT Query');
        const countResult = await queryClient`
            SELECT COUNT(*) as count FROM users
        `;
        console.log(`Totalt antal användare (COUNT): ${countResult[0].count}`);

        // Check specific user
        console.log('\n\n📊 Metod 4: Check specifik användare (sandra@sandra.com)');
        const specificUserDrizzle = await db.select()
            .from(users)
            .where(eq(users.email, 'sandra@sandra.com'))
            .limit(1);
        console.log(`Användare hittad (Drizzle): ${specificUserDrizzle.length > 0 ? 'JA' : 'NEJ'}`);
        
        const specificUserRaw = await queryClient`
            SELECT id, email, name FROM users WHERE email = 'sandra@sandra.com' LIMIT 1
        `;
        console.log(`Användare hittad (Raw SQL): ${specificUserRaw.length > 0 ? 'JA' : 'NEJ'}`);

        console.log('\n=== SLUT ===\n');

    } catch (error) {
        console.error('❌ Fel vid läsning av användare:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

viewUsers();

