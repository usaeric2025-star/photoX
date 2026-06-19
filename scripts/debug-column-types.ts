
import postgres from 'postgres';
import { getServerEnv } from '../api/_shared/envSchema.js';

const env = getServerEnv(process.env);
const connectionString = env.DATABASE_URL;

const sql = postgres(connectionString || '', { max: 1 });

async function run() {
  try {
    const tables = ['manufacturers', 'tags', 'groups', 'furniture_items'];
    for (const table of tables) {
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table};
      `;
      console.log(`${table.toUpperCase()} COLUMNS:`, columns);
    }
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await sql.end();
  }
}

run();
