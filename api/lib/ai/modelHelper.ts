import { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash-pro'; // Just as a literal fallback constant if absolute needed, but we rely on settings mostly.

/**
 * Gets the configured AI model from database settings, fallback to default if not found
 */
export async function getModel(supabase: SupabaseClient): Promise<string> {
    const { data: settings } = await supabase.from('settings').select('openrouter_model').maybeSingle();
    const model = settings?.openrouter_model?.trim();
    if (model) return model;
    return DEFAULT_OPENROUTER_MODEL;
}
