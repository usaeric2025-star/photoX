import 'dotenv/config';
import postgres from 'postgres';

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const errorIndexes = await sql`
      SELECT c.relname as index_name, c2.relname as table_name
      FROM pg_class c
      JOIN pg_index i ON i.indexrelid = c.oid
      JOIN pg_class c2 ON i.indrelid = c2.oid
      WHERE c.relname LIKE '%too_large%' OR c.relpages > 1000;
    `;
    console.log('Large indexes:', errorIndexes);
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}
run();
