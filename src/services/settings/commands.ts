import { supabase } from '#lib/supabase';
import { DB_CONFIG } from '#src/constants/config';
import { ErrorFactory } from '#lib/error/ErrorFactory';

import { AppSettings } from '#src/types';

import { api } from '#lib/api';

/**
 * 核心設置字段白名單 (Database Columns Only)
 * 嚴禁將前端狀態字段 (UI state) 直接傳入數據庫
 */
const SETTINGS_COLUMNS = [
    'id', 'logo_url', 'openrouter_model',
    'access_passcode', 'whatsapp_1', 'whatsapp_1_name', 
    'whatsapp_2', 'whatsapp_2_name', 'tags_json', 'updated_at'
];

export const saveSettings = async (settings: Partial<AppSettings> & Record<string, unknown>) => {
    try {
        const rawPayload = { ...settings };
        const payload: Record<string, unknown> = { id: 1 };
        
        // 1. 字段映射與預處理
        if (rawPayload.agnes_api_key === "••••••••••••••••") delete rawPayload.agnes_api_key;
        if (rawPayload.api_key) delete rawPayload.api_key;
        
        const mapping: Record<string, string> = {};

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
            void api.admin.settings['save-provider'].$post({
                json: { provider: rawPayload.provider }
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

        const res = await api.admin.settings['save-settings'].$post({
            json: { settingsPayload: payload }
        });
        
        if (!res.ok) {
            const respBody = await res.json().catch(() => ({ error: 'Unknown server error' }));
            throw ErrorFactory.wrap(new Error(`DB_ERROR: ${respBody.error || 'Unknown database error'}`), 'commands');
        }
        
        return true;
    } catch (err) {
        ErrorFactory.handle(err, { context: 'saveSettings' });
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
            ErrorFactory.handle(uploadError, { context: 'uploadLogo.upload' });
            throw ErrorFactory.wrap(uploadError, 'uploadLogo', fileName);
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        // Upsert settings table with new logo_url
        const res = await api.admin.settings['upsert-logo'].$post({
            json: { url: publicUrl }
        });

        if (!res.ok) {
            ErrorFactory.handle(new Error(await res.text()), { context: 'uploadLogo.upsert' });
        }

        return publicUrl;
    } catch (err: unknown) {
        ErrorFactory.handle(err, { context: 'uploadLogo' });
        throw ErrorFactory.wrap(err instanceof Error ? err : new Error(String(err)), 'uploadLogo');
    }
};
