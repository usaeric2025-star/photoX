import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://vbpnlkeweqkjufijtdph.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8');

async function run() {
  const { data: d1, error: e1 } = await supabase.from('product_tags').select('*').limit(1);
  const { data: d2, error: e2 } = await supabase.from('product_categories').select('*').limit(1);
  const { data: d3, error: e3 } = await supabase.from('product_manufacturers').select('*').limit(1);
  console.log({ tags: d1, e1, categories: d2, e2, manufacturers: d3, e3 });
  
  const { data: d4, error: e4 } = await supabase.from('tags').select('*').limit(1);
  const { data: d5, error: e5 } = await supabase.from('categories').select('*').limit(1);
  const { data: d6, error: e6 } = await supabase.from('manufacturers').select('*').limit(1);
  console.log({ tags_short: d4, e4, categories_short: d5, e5, manufacturers_short: d6, e6 });
}
run();
