import 'dotenv/config';
import postgres from 'postgres';

async function checkView() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  
  const sql = postgres(connectionString);
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'v_photos_list';
    `;
    console.log('Columns in v_photos_list:', columns);
    
    const matView = await sql`
      SELECT matviewname, definition 
      FROM pg_matviews 
      WHERE matviewname = 'v_photos_list';
    `;
    console.log('Materialized View Definition:', matView);
  } catch (err) {
    console.error('Error checking view:', err);
  } finally {
    await sql.end();
  }
}

checkView();
