import { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash-lite';

/**
 * Gets the configured AI model from database settings, fallback to default if not found
 */
export async function getModel(supabase: SupabaseClient): Promise<string> {
    const { data: settings } = await supabase.from('settings').select('openrouter_model').maybeSingle();
    return settings?.openrouter_model || DEFAULT_OPENROUTER_MODEL;
}
