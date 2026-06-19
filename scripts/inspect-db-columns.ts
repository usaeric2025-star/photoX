
import { db } from '../api/_lib/db/index.js';
import { sql } from 'drizzle-orm';

async function debug() {
  const tables = ['categories', 'manufacturers', 'tags', 'groups', 'furniture_items', 'settings'];
  
  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`);
    try {
      const result = await db.execute(sql`SELECT * FROM ${sql.identifier(table)} LIMIT 1`);
      if (result.rows.length > 0) {
        console.log('Columns:', Object.keys(result.rows[0]));
      } else {
        // If empty, try to get columns from info schema but just for this table
        const info = await db.execute(sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = ${table}
        `);
        console.log('Columns (empty table):', info.rows.map(r => r.column_name));
      }
    } catch (e) {
      console.error(`Error with ${table}:`, e.message);
    }
  }
}

debug().catch(console.error);
