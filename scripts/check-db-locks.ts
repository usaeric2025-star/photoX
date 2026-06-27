import 'dotenv/config';
import postgres from 'postgres';

async function checkLocks() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  
  const sql = postgres(connectionString);
  try {
    const locks = await sql`
      SELECT a.pid, l.locktype, l.mode, l.granted, a.query 
      FROM pg_locks l 
      JOIN pg_stat_activity a ON l.pid = a.pid 
      WHERE NOT granted;
    `;
    console.log('Blocked Locks:', locks);
    
    const activity = await sql`
      SELECT pid, state, query, duration 
      FROM (
        SELECT pid, state, query, now() - query_start AS duration 
        FROM pg_stat_activity 
        WHERE state != 'idle'
      ) s 
      WHERE duration > interval '5 seconds';
    `;
    console.log('Long Running Queries:', activity);
  } catch (err) {
    console.error('Error checking locks:', err);
  } finally {
    await sql.end();
  }
}

checkLocks();
