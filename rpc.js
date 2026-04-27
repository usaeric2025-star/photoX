import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://vbpnlkeweqkjufijtdph.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8');

async function run() {
  const { data: d1, error: e1 } = await supabase.from('categories').select('*').limit(1);
  console.log('categories', d1, e1);

  // Maybe 'dbCategories' ? The DB object is categories.
  // Wait, if the prompt says "用数据库返回的 UUID", maybe the prompt's author means we should just let Supabase generate UUID for furniture_items (by omitting the id).
  // But for Tags/Categories? "新增标签/分类时 先调用 API 存入数据库 用数据库返回的 UUID"
  console.log("Are there backend functions?");
  // Let's list all REST endpoints from swagger.
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
  const spec = await res.json();
  console.log("Paths:", Object.keys(spec.paths).filter(p => !p.startsWith('/rpc')));
}
run();
