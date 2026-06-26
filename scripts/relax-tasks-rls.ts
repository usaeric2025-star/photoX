import 'dotenv/config';
import postgres from 'postgres';
async function run() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    // Drop existing restrictive policies
    await sql`DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;`;
    await sql`DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;`;
    
    // Create permissive policies
    await sql`CREATE POLICY "Allow public select" ON tasks FOR SELECT USING (true);`;
    await sql`CREATE POLICY "Allow public insert" ON tasks FOR INSERT WITH CHECK (true);`;
    await sql`CREATE POLICY "Allow public update" ON tasks FOR UPDATE USING (true);`;
    await sql`CREATE POLICY "Allow public delete" ON tasks FOR DELETE USING (true);`;
    
    console.log('Relaxed RLS on tasks table successfully.');
  } catch(e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}
run();
