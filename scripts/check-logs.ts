import 'dotenv/config';
import postgres from 'postgres';

async function checkLogs() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    return;
  }
  
  const sql = postgres(connectionString);
  try {
    const logs = await sql`SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 20;`;
    console.log(JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('Failed to fetch logs:', err);
  } finally {
    await sql.end();
  }
}

checkLogs();
