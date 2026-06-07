import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return;
  const supabase = createClient(url, key);

  const { data: settings } = await supabase.from('settings').select('*').maybeSingle();
  console.log("Settings row in DB:", JSON.stringify(settings, null, 2));
}
run();
