import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks';`;
  console.log(cols);
  await sql.end();
}
run();
