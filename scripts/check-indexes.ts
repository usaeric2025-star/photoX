import 'dotenv/config';
import postgres from 'postgres';

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const indexes = await sql`
      SELECT
        indexname,
        indexdef
      FROM
        pg_indexes
      WHERE
        tablename = 'tasks';
    `;
    console.log('Indexes on tasks table:');
    console.log(indexes);
  } finally {
    await sql.end();
  }
}
run();
