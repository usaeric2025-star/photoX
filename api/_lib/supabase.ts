import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "../_shared/envSchema.js";

const serverEnv = getServerEnv(process.env);
let supabaseAdminInstance: SupabaseClient | null = null;

export async function getSupabaseAdmin() {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }
  
  const supabaseUrl = serverEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL;
  const supabaseKey = serverEnv.SUPABASE_SERVICE_KEY || serverEnv.VITE_SUPABASE_ANON_KEY; 
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials missing");
  }
  supabaseAdminInstance = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  return supabaseAdminInstance;
}
