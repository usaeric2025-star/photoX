import 'dotenv/config';
import postgres from 'postgres';

async function checkSystemLogsTable() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  
  const sql = postgres(connectionString);
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'system_logs';
    `;
    console.log('Columns in system_logs:', columns);
  } catch (err) {
    console.error('Error checking system_logs:', err);
  } finally {
    await sql.end();
  }
}

checkSystemLogsTable();
