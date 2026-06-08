import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { count, error } = await supabase.from('furniture_items').select('*', { count: 'exact', head: true });
  console.log('furniture_items error:', error ? error.message : 'NONE');
  console.log('furniture_items count:', count);
}
test();
