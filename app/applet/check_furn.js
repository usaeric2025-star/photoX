import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://vbpnlkeweqkjufijtdph.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8');

async function run() {
  const { data, error } = await supabase.from('furniture_items').select('*').limit(1);
  console.log(data, error);
}
run();
