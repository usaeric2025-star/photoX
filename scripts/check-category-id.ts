import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'id';`;
  console.log(cols);
  await sql.end();
}
run();
