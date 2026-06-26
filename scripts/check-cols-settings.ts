import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'settings';`;
  console.log(cols.map(c => c.column_name));
  await sql.end();
}
run();
