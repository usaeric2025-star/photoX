import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const rls = await sql`
    SELECT relname, relrowsecurity 
    FROM pg_class 
    WHERE relname = 'tasks';
  `;
  console.log('RLS Enabled?', rls);
  await sql.end();
}
run();
