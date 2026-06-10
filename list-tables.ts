import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, serviceKey);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // try direct query to pg_catalog or public schema information
    console.error('RPC get_tables error:', error);
    
    // Fallback: Query pg_tables inside postgres via SQL, wait we don't have direct sql exec unless we use an api
    // Let's see if we can do a query to select a common table or use standard query
    const tablenames = ['furniture_items', 'categories', 'tags', 'photo_tags', 'groups', 'photo_ai_results', 'system_logs', 'maintenance_logs'];
    for (const table of tablenames) {
      const { error: tblError } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (tblError) {
        console.log(`Table '${table}' query status: Failed (${tblError.message})`);
      } else {
        console.log(`Table '${table}' query status: SUCCESS!`);
      }
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
