import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('furniture_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching from furniture_items:', error.message);
    return;
  }
  console.log('furniture_items columns:', Object.keys(data[0] || {}));
}
test();
