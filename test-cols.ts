import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data } = await supabase.from('error_events').select('*').limit(1);
  const { data: d2 } = await supabase.from('system_logs').select('*').limit(1);
  console.log("error_events:", data);
  console.log("system_logs:", d2);
}
check();
