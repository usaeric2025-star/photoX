import 'dotenv/config';
import postgres from 'postgres';

async function findViewRefreshLogs() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  
  const sql = postgres(connectionString);
  try {
    const logs = await sql`SELECT * FROM system_logs WHERE message LIKE '%View Refresh%' ORDER BY created_at DESC LIMIT 50;`;
    console.log(JSON.stringify(logs, null, 2));
  } catch (err) {
    console.error('Error fetching refresh logs:', err);
  } finally {
    await sql.end();
  }
}

findViewRefreshLogs();
