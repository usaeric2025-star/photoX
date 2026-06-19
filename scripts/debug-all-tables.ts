
import postgres from 'postgres';
import { getServerEnv } from '../api/_shared/envSchema.js';

const env = getServerEnv(process.env);
const connectionString = env.DATABASE_URL;

const sql = postgres(connectionString || '', { max: 1 });

async function run() {
  try {
    const tables = ['groups', 'tags', 'furniture_items', 'photo_tags', 'ai_audit_logs', 'system_logs', 'secrets'];
    for (const table of tables) {
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${table};
      `;
      console.log(`${table.toUpperCase()} COLUMNS:`, columns.map(c => c.column_name));
    }
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await sql.end();
  }
}

run();
