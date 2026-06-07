import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "../../shared/envSchema.js";

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
    const { data: settings } = await supabase.from('settings').select('openrouter_model').maybeSingle();
    let model = settings?.openrouter_model;
    if (!model) {
      const { data: secret } = await supabase.from('secrets').select('value').eq('key', 'OPENROUTER_MODEL').maybeSingle();
      model = secret?.value || 'google/gemini-2.0-flash-exp:free';
    }
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
