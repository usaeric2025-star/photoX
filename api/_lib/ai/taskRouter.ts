import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "../../_shared/envSchema.js";
import { getModel } from "./modelHelper.js";

const serverEnv = getServerEnv(process.env);

export type AITask = string;

async function getSupabaseAdmin() {
  const supabaseUrl = serverEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL;
  const supabaseKey = serverEnv.SUPABASE_SERVICE_KEY || serverEnv.VITE_SUPABASE_ANON_KEY; 
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase credentials missing");
  return createClient(supabaseUrl, supabaseKey);
}

export async function getTaskConfig(task: AITask) {
  const supabase = await getSupabaseAdmin();
  const model = await getModel(supabase) || 'gemini-2.5-flash-lite';
  return {
    provider: 'openrouter',
    model,
    apiKeyKey: 'openrouter'
  };
}
