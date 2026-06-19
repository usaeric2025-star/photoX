
import { db } from '../api/_lib/db/index.js';
import { sql } from 'drizzle-orm';

async function debug() {
  try {
    const info = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'settings'
    `);
    console.log('Settings Columns:', info.rows.map(r => r.column_name));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
debug().catch(console.error);
