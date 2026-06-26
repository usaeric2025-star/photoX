import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const settings = await sql`SELECT * FROM settings WHERE id = 1;`;
  console.log('Settings:', settings);
  await sql.end();
}
run();
