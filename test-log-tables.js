import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('--- Testing error_events ---');
  const res1 = await supabase.from('error_events').select('*').limit(5);
  if (res1.error) {
    console.error('error_events error:', res1.error.message);
  } else {
    console.log('error_events count:', res1.data.length);
    console.log('error_events first item:', JSON.stringify(res1.data[0], null, 2));
  }

  console.log('\n--- Testing system_logs ---');
  const res2 = await supabase.from('system_logs').select('*').limit(5);
  if (res2.error) {
    console.error('system_logs error:', res2.error.message);
  } else {
    console.log('system_logs count:', res2.data.length);
    console.log('system_logs first item:', JSON.stringify(res2.data[0], null, 2));
  }
}
test();
