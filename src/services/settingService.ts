import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';

import { AppSettings } from '../types';

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
        if (data.api_key) data.gemini_api_key = data.api_key;
        if (data.model_name) data.custom_model = data.model_name;
        
        if (data.tags_json) {
            try {
                const parsed = JSON.parse(data.tags_json);
                if (parsed.pinnedTags) data.pinnedTags = parsed.pinnedTags;
                if (parsed.hotTagsCount !== undefined) data.hotTagsCount = parsed.hotTagsCount;
                if (parsed.hotTagThreshold !== undefined) data.hotTagThreshold = parsed.hotTagThreshold;
            } catch (e) {}
        }
    }
    
    return data;
};

export const saveSettings = async (settings: Partial<AppSettings> & Record<string, unknown>) => {
    try {
        const payload = { ...settings };
        
        // Map fields to requested columns
        if (payload.gemini_api_key) {
            payload.api_key = payload.gemini_api_key;
        }
        if (payload.custom_model) {
            payload.model_name = payload.custom_model;
        }

        // Handle hot tags
        if (payload.pinnedTags || payload.hotTagsCount !== undefined || payload.hotTagThreshold !== undefined) {
            payload.tags_json = JSON.stringify({
                pinnedTags: payload.pinnedTags || [],
                hotTagsCount: payload.hotTagsCount || 9,
                hotTagThreshold: payload.hotTagThreshold || 1,
            });
        }

        // REMOVE all redundant fields that are now in separate tables
        delete payload.gemini_api_key;
        delete payload.custom_model;
        delete payload.categories;
        delete payload.tags; // Keep tags_json!
        delete payload.manufacturers;
        delete payload.manufacturers_json;
        delete payload.categories_json;
        
        delete payload.pinnedTags;
        delete payload.hotTagsCount;
        delete payload.hotTagThreshold;

        const { error: upsertError } = await supabase
            .from('settings')
            .upsert({ ...payload, id: 1 }, { onConflict: 'id' });
            
        if (upsertError) {
            console.error("Error upserting settings:", upsertError);
            throw upsertError;
        }
        
        return true;
    } catch (err: unknown) {
        console.error("Error in saveSettings:", err);
        throw err;
    }
};

export const uploadLogo = async (file: File) => {
    // Using the same bucket as photos for better reliability
    const bucketName = DB_CONFIG.BUCKET_NAME; 
    const fileName = `app/logo-${Date.now()}.webp`;
    
    try {
        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, file, { upsert: true });

        if (uploadError) {
            console.error("Supabase Logo Upload Error:", uploadError);
            throw new Error(`Logo 上傳失敗: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        // Update settings table with new logo_url
        const { error: updateError } = await supabase
            .from('settings')
            .update({ logo_url: publicUrl })
            .eq('id', 1);

        if (updateError) {
            console.error("Failed to update logo url in settings:", updateError);
        }

        return publicUrl;
    } catch (err: unknown) {
        console.error("Logo upload process error:", err);
        throw err;
    }
};
