import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['groups', 'categories', 'tags', 'manufacturers', 'furniture_items', 'system_logs', 'error_events', 'maintenance_jobs'];
  for (const table of tables) {
     const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
     console.log(`${table}: ${count} ${error ? error.message : ''}`);
  }
}
check();
