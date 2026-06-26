import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  // Check furniture_items first
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'furniture_items';`;
  console.log('furniture_items:', cols);
  
  // Check tasks
  const tasksCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tasks';`;
  console.log('tasks:', tasksCols);
  await sql.end();
}
run();
