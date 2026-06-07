import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "../../shared/envSchema.js";
import { getModel } from "./modelHelper.js";

const serverEnv = getServerEnv(process.env);

export type AITask = 'image_recognition' | 'text_chat' | 'text_to_image' | 'image_to_image' | 'video_generate';

const AGNES_MODELS = {
  text_chat: 'agnes-2.0-flash',
  text_to_image: 'agnes-image-2.1-flash',
  image_to_image: 'agnes-image-2.0-flash',
  video_generate: 'agnes-video-v2.0'
};

async function getSupabaseAdmin() {
  const supabaseUrl = serverEnv.VITE_SUPABASE_URL || serverEnv.SUPABASE_URL;
  const supabaseKey = serverEnv.SUPABASE_SERVICE_KEY || serverEnv.VITE_SUPABASE_ANON_KEY; 
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase credentials missing");
  return createClient(supabaseUrl, supabaseKey);
}

export async function getTaskConfig(task: AITask) {
  const supabase = await getSupabaseAdmin();
  if (task === 'image_recognition') {
    const model = await getModel(supabase);
    return {
      provider: 'openrouter',
      model,
      apiKeyKey: 'openrouter'
    };
  } else {
    return {
      provider: 'agnes',
      model: AGNES_MODELS[task],
      apiKeyKey: 'agnes'
    };
  }
}
