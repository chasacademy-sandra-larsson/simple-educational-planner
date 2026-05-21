import { pgGenerate } from 'drizzle-dbml-generator';
import * as schema from './schema';

// Workaround: drizzle-dbml-generator doesn't support unique constraints in extraConfig
// We'll generate the DBML and then manually update it, or create a filtered schema
try {
    pgGenerate({
        schema,
        out: './schema.dbml',
        relational: true,
    });
} catch (error) {
    console.error('Error generating DBML:', error);
    console.log('\nNote: drizzle-dbml-generator may not support unique constraints in extraConfig.');
    console.log('The schema.dbml file has been manually updated with the constraints.');
    console.log('You can view it directly or regenerate it after updating drizzle-dbml-generator.\n');
    process.exit(1);
}