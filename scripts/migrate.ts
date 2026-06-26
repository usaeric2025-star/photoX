import 'dotenv/config';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  
  const sql = postgres(process.env.DATABASE_URL);
  try {
    const migration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/0007_lame_madrox.sql'), 'utf-8');
    await sql.unsafe(migration);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sql.end();
  }
}

run();
