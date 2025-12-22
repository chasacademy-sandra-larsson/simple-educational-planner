import { pgGenerate } from 'drizzle-dbml-generator';
import * as schema from './schema';

pgGenerate({
    schema,
    out: './schema.dbml',
    relational: true,
  });