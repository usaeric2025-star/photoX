import { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash-lite'; // Just as a literal fallback constant if absolute needed, but we rely on settings mostly.

/**
 * Gets the configured AI model from database settings, fallback to default if not found
 */
export async function getModel(supabase: SupabaseClient): Promise<string> {
    try {
        const { data } = await supabase.from('settings').select('openrouter_model').eq('id', 1).maybeSingle();
        if (data?.openrouter_model) {
            return data.openrouter_model;
        }
    } catch (e) {
        console.error("[modelHelper] Error reading openrouter_model:", e);
    }
    return DEFAULT_OPENROUTER_MODEL;
}
