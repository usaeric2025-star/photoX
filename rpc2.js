import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://vbpnlkeweqkjufijtdph.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8');
async function run() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
  const html = await res.text();
  // Usually this returns the swagger JSON if headers specify application/json
  const res2 = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`, { headers: { 'Accept': 'application/json' }});
  const json = await res2.json();
  console.log("Paths:", Object.keys(json.paths || {}));
}
run();
