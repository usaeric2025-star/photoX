
import { db } from '../api/_lib/db/index.js';
import { sql } from 'drizzle-orm';

async function debug() {
  const tables = ['categories'];
  
  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`);
    try {
      const info = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = ${table}
        ORDER BY ordinal_position
      `);
      console.log(info.rows);
    } catch (e) {
      console.error(`Error fetching info for ${table}:`, e.message);
    }
  }
}

debug().catch(console.error);
