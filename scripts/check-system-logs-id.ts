import 'dotenv/config';
import postgres from 'postgres';

async function checkSystemLogsDefault() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  
  const sql = postgres(connectionString);
  try {
    const info = await sql`
      SELECT column_name, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'system_logs' AND column_name = 'id';
    `;
    console.log('ID info:', info);
  } catch (err) {
    console.error('Error checking system_logs ID:', err);
  } finally {
    await sql.end();
  }
}

checkSystemLogsDefault();
