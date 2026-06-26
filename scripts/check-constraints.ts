import 'dotenv/config';
import postgres from 'postgres';

async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const checks = await sql`
    SELECT
      con.conname AS constraint_name,
      con.contype AS constraint_type,
      pg_get_constraintdef(con.oid) AS constraint_definition,
      rel.relname AS table_name
    FROM
      pg_constraint con
    INNER JOIN pg_class rel
      ON rel.oid = con.conrelid
    WHERE
      con.contype = 'c';
  `;
  console.log('Check constraints:', checks);
  await sql.end();
}
run();
