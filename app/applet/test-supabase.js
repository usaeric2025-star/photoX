import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const res = await supabase.from('furniture_items').select('*').limit(1);
  console.log('Error:', res.error);
  if (res.data) console.log('Keys:', Object.keys(res.data[0] || {}));
}
test();
