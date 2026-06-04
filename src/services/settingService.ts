import { supabase } from '../lib/supabase';
import { DB_CONFIG } from '../constants/config';
import { ErrorFactory } from '../lib/error/ErrorFactory';

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
        data.gemini_api_key = data.api_key;
        data.custom_model = data.openrouter_model;
        data.provider = 'openrouter'; // Default
        
        // Fetch key status and primary provider from backend
        try {
            const keysRes = await fetch('/api/admin/settings/get-keys');
            if (keysRes.ok) {
                const keysData = await keysRes.json();
                if (keysData.success && keysData.keysStatus) {
                    const status = keysData.keysStatus;
                    data.provider = status.primaryProvider || 'openrouter';
                    
                    // Only populate gemini_api_key placeholder if OpenRouter actually has a key
                    if (status.openrouter || data.api_key) {
                        data.gemini_api_key = data.api_key || "••••••••••••••••";
                    } else {
                        data.gemini_api_key = "";
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

/**
 * 核心設置字段白名單 (Database Columns Only)
 * 嚴禁將前端狀態字段 (UI state) 直接傳入數據庫
 */
const SETTINGS_COLUMNS = [
    'id', 'logo_url', 'api_key', 'openrouter_model',
    'access_passcode', 'whatsapp_1', 'whatsapp_1_name', 
    'whatsapp_2', 'whatsapp_2_name', 'tags_json', 'updated_at'
];

export const saveSettings = async (settings: Partial<AppSettings> & Record<string, unknown>) => {
    try {
        const rawPayload = { ...settings };
        const payload: Record<string, any> = { id: 1 };
        
        // 1. 字段映射與預處理
        if (rawPayload.gemini_api_key === "••••••••••••••••") delete rawPayload.gemini_api_key;
        
        const mapping: Record<string, string> = {
            'gemini_api_key': 'api_key',
            'custom_model': 'openrouter_model'
        };

        // 2. 根據白名單構建最終 Payload
        Object.entries(rawPayload).forEach(([key, value]) => {
            const dbKey = mapping[key] || key;
            if (dbKey === 'ai_provider') return; // Explicit exclude
            if (SETTINGS_COLUMNS.includes(dbKey)) {
                payload[dbKey] = value;
            }
        });

        // 2.1 特別處理首選供應商 (經由專用 API)
        if (rawPayload.provider) {
            void fetch('/api/admin/settings/save-provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: rawPayload.provider })
            });
        }

        // 3. 處理熱點標籤 JSON
        if (rawPayload.pinned_tags || rawPayload.hot_tags_count !== undefined) {
            payload.tags_json = JSON.stringify({
                pinned_tags: rawPayload.pinned_tags || [],
                hot_tags_count: rawPayload.hot_tags_count ?? 9,
                hot_tag_threshold: rawPayload.hot_tag_threshold ?? 1,
            });
        }

        payload.updated_at = new Date().toISOString();

        const { error: upsertError } = await supabase
            .from('settings')
            .upsert(payload, { onConflict: 'id' });
            
        if (upsertError) {
            throw new Error(`DB_ERROR: ${upsertError.message || 'Unknown database error'}`);
        }
        
        return true;
    } catch (err: any) {
        console.error("Save settings fatal error:", err);
        throw ErrorFactory.wrap(err, 'saveSettings');
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
            throw ErrorFactory.wrap(uploadError, 'uploadLogo', fileName);
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        // Upsert settings table with new logo_url
        const { error: updateError } = await supabase
            .from('settings')
            .upsert({ id: 1, logo_url: publicUrl }, { onConflict: 'id' });

        if (updateError) {
            console.error("Failed to upsert logo url in settings:", updateError);
        }

        return publicUrl;
    } catch (err: unknown) {
        console.error("Logo upload process error:", err);
        throw ErrorFactory.wrap(err instanceof Error ? err : new Error(String(err)), 'uploadLogo');
    }
};
