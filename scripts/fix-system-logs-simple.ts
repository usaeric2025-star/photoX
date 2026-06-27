import 'dotenv/config';
import postgres from 'postgres';

async function fixSystemLogsIdentity() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  
  const sql = postgres(connectionString);
  try {
    // 1. Create a sequence
    await sql`CREATE SEQUENCE IF NOT EXISTS system_logs_id_seq;`;
    
    // 2. Set the current value of the sequence
    await sql`SELECT setval('system_logs_id_seq', COALESCE((SELECT MAX(id) FROM system_logs), 0) + 1);`;
    
    // 3. Set the default value of the column
    await sql`ALTER TABLE system_logs ALTER COLUMN id SET DEFAULT nextval('system_logs_id_seq');`;
    
    console.log('Successfully set default for system_logs.id');
  } catch (err: any) {
    console.error('Failed to fix system_logs identity:', err);
  } finally {
    await sql.end();
  }
}

fixSystemLogsIdentity();
