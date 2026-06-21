import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "../_shared/envSchema.js";
import { logger } from './logger.js';

const serverEnv = getServerEnv(process.env);
let supabaseAdminInstance: SupabaseClient | null = null;

export async function getSupabaseAdmin() {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }
  
  const supabaseUrl = serverEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL;
  const supabaseKey = serverEnv.SUPABASE_SERVICE_KEY || serverEnv.VITE_SUPABASE_ANON_KEY; 
  
  if (!supabaseUrl || !supabaseKey) {
    const missing = [];
    if (!supabaseUrl) missing.push("SUPABASE_URL");
    if (!supabaseKey) missing.push("SUPABASE_KEY");
    logger.error(`[Supabase] Configuration missing: ${missing.join(", ")}`);
    throw new Error(`Supabase credentials missing: ${missing.join(", ")}`);
  }
  
  try {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    return supabaseAdminInstance;
  } catch (err: unknown) {
    logger.error("[Supabase] Failed to create client", { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
