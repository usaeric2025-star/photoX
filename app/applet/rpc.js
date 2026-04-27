import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://vbpnlkeweqkjufijtdph.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_mXZxsfqH-fATbT2g9fiX7A_-VfzOwa8');

async function run() {
  // we can just select from pg_stat_user_tables but we don't have access. 
  // Let's just try to call UUID generation RPC. Or maybe there's a file with RPCs?
  console.log("checking...");
}
run();
