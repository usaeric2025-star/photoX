import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://vbpnlkeweqkjufijtdph.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8');
async function run() {
  const { data, error } = await supabase.rpc('get_uuid');
  console.log('get_uuid:', data, error);
  const { data: d2, error: e2 } = await supabase.rpc('generate_uuid');
  console.log('generate_uuid:', d2, e2);
  const { data: d3, error: e3 } = await supabase.rpc('gen_random_uuid');
  console.log('gen_random_uuid:', d3, e3);
  const { data: d4, error: e4 } = await supabase.rpc('uuid_generate_v4');
  console.log('uuid_generate_v4:', d4, e4);
}
run();
