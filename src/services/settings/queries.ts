import { supabase } from '../../lib/supabase';
import { api } from '@/lib/api';

export const fetchSettings = async () => {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
    
    if (error) {
        console.error("Failed to fetch settings:", error);
        return null;
    }
    
    if (!data) return null;
    
    // Map custom columns back to app expectations
    if (data) {
        data.agnes_api_key = data.api_key;
        data.custom_model = data.openrouter_model;
        data.provider = 'openrouter'; // Default
        
        // Fetch key status and primary provider from backend
        try {
            const keysRes = await api.admin.settings['get-keys'].$get() as any;
            if (keysRes.ok) {
                const keysData = await keysRes.json();
                if (keysData.success && keysData.keysStatus) {
                    const status = keysData.keysStatus;
                    data.provider = status.primaryProvider || 'openrouter';
                    
                    // Only populate agnes_api_key placeholder if any AI provider has a key
                    if (status.openrouter || status.agnes || data.api_key) {
                        data.agnes_api_key = data.api_key || "••••••••••••••••";
                    } else {
                        data.agnes_api_key = "";
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch keys status from backend in fetchSettings:", e);
        }
        
        if (data.tags_json) {
            try {
                const parsed = JSON.parse(data.tags_json);
                if (parsed.pinned_tags) data.pinned_tags = parsed.pinned_tags;
                if (parsed.hot_tags_count !== undefined) data.hot_tags_count = parsed.hot_tags_count;
                if (parsed.hot_tag_threshold !== undefined) data.hot_tag_threshold = parsed.hot_tag_threshold;
            } catch (e) {}
        }
    }
    
    return data;
};
