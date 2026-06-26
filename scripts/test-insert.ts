import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
      await sql`
        INSERT INTO furniture_items (id, user_id, name, created_at, updated_at)
        VALUES (
            '444d8aec-edad-40c6-97c8-276a5a84eada',
            '8ec53131-a589-4b50-beb4-6b5308541e1b',
            '{"zh": "test"}',
            NOW(),
            NOW()
        );
      `;
      console.log('Insert succeeded');
  } catch (err) {
    console.error('Insert failed:', err);
  } finally {
    await sql.end();
  }
}
run();
