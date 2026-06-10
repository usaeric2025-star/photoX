import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../lib/supabase.js";
import { encrypt } from '../../lib/encryption.js';

export const adminSettings = new Hono();

adminSettings.get("/get-keys", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        const { data: secrets } = await supabase.from('secrets').select('key, value');
        const configuredProviders = secrets?.map(s => s.key) || [];
        
        const { data: settings } = await supabase.from('settings').select('api_key').eq('id', 1).maybeSingle();
        const hasOpenrouter = configuredProviders.includes('openrouter') || !!settings?.api_key;
        
        const primarySecret = secrets?.find(s => s.key === 'PRIMARY_AI_PROVIDER');
        
        return c.json({
            success: true,
            keysStatus: { 
                openrouter: hasOpenrouter, 
                primaryProvider: primarySecret?.value || 'openrouter' 
            }
        });
    } catch (e: any) {
        return c.json({ success: false, error: e.message }, 500);
    }
});

adminSettings.post("/save-key", async (c) => {
    try {
        const { provider, apiKey } = await c.req.json();
        if (!provider || !apiKey) return c.json({ success: false, error: "缺少必要參數" }, 400);

        const supabase = await getSupabaseAdmin();
        const encryptedKey = encrypt(apiKey);
        
        const { error } = await supabase.from('secrets').upsert({ 
            key: provider, 
            value: encryptedKey,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;
        
        return c.json({ 
            success: true, 
            message: `密鑰已加密保存！` 
        });
    } catch (e: any) {
        console.error("Save key failed:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

adminSettings.post("/save-provider", async (c) => {
    try {
        const { provider } = await c.req.json();
        if (!provider) {
            return c.json({ success: false, error: "Missing provider" }, 400);
        }
        const supabase = await getSupabaseAdmin();
        // 將首選供應商存入 secrets 表而非 settings 表，以避免 schema cache 錯誤
        const { error } = await supabase.from('secrets').upsert({ 
            key: 'PRIMARY_AI_PROVIDER', 
            value: provider,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
        
        return c.json({ success: true });
    } catch (e: any) {
        console.error("Save provider failed:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});


