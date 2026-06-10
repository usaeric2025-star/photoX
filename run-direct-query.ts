import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('Querying table names via information_schema...');
  // PostgREST doesn't allow direct SELECT * FROM information_schema.tables over custom endpoints unless we go via pg SQL or some rpc we have.
  // Wait, let's see what tables we can select * from.
  const tables = ['ai_audit_logs', 'system_logs', 'photo_ai_results'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t} * query failed:`, error.message);
    } else {
      console.log(`Table ${t} * query SUCCESS! Found ${data?.length} rows.`);
    }
  }
}

run();
