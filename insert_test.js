import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://vbpnlkeweqkjufijtdph.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8');
async function run() {
  const res = await supabase.from('tags').insert({ name: 'TEST' }).select();
  console.log('tags:', res);
  
  const res2 = await supabase.from('product_tags').insert({ name: 'TEST' }).select();
  console.log('product_tags:', res2);
  
  const res3 = await supabase.from('product_categories').insert({ name: 'TEST' }).select();
  console.log('product_categories:', res3);
  
  const res4 = await supabase.from('manufacturers').insert({ name: 'TEST' }).select();
  console.log('manufacturers:', res4);
}
run();
