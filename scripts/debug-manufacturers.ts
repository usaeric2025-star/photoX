
import postgres from 'postgres';
import { getServerEnv } from '../api/_shared/envSchema.js';

const env = getServerEnv(process.env);
const connectionString = env.DATABASE_URL;

const sql = postgres(connectionString || '', { max: 1 });

async function run() {
  try {
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'manufacturers';
    `;
    console.log("MANUFACTURERS COLUMNS:", JSON.stringify(columns, null, 2));
    
    const rows = await sql`SELECT * FROM manufacturers LIMIT 1`;
    if (rows.length > 0) {
      console.log("FIRST ROW KEYS:", Object.keys(rows[0]));
    } else {
      console.log("MANUFACTURERS TABLE IS EMPTY");
    }
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await sql.end();
  }
}

run();
