import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { error } = await supabase.from('system_logs').insert([
    {
      error_message: 'Test anon insert',
      url: 'http://localhost'
    }
  ]);
  console.log('Anon insert error:', error ? error.message : 'SUCCESS');
}
test();
