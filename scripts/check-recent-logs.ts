import 'dotenv/config';
import postgres from 'postgres';

async function checkRecentLogs() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    return;
  }
  
  const sql = postgres(connectionString);
  try {
    const fiveMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const logs = await sql`SELECT * FROM system_logs WHERE created_at > ${fiveMinutesAgo} ORDER BY created_at DESC LIMIT 50;`;
    if (logs.length === 0) {
      console.log('No logs found in the last 10 minutes.');
    } else {
      console.log(JSON.stringify(logs, null, 2));
    }
  } catch (err) {
    console.error('Failed to fetch logs:', err);
  } finally {
    await sql.end();
  }
}

checkRecentLogs();
