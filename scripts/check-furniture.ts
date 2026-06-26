import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'furniture_items' AND column_name IN ('id', 'user_id', 'category_id', 'price');`;
  console.log(cols);
  await sql.end();
}
run();
