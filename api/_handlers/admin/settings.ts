import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../_lib/supabase.js";
import { encrypt } from '../../_lib/encryption.js';

export const adminSettings = new Hono();

adminSettings.get("/get-keys", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        
        // Parallelize DB queries to reduce latency
        const [secretsRes, settingsRes] = await Promise.all([
            supabase.from('secrets').select('key, value'),
            supabase.from('settings').select('gemini_api_key').maybeSingle()
        ]);

        const secrets = secretsRes.data || [];
        const configuredProviders = secrets.map((s: any) => s.key);
        
        let hasOpenrouter = configuredProviders.includes('openrouter');
        let hasGemini = configuredProviders.includes('gemini');
        const primarySecret = secrets.find((s: any) => s.key === 'PRIMARY_AI_PROVIDER');

        // Fallback for UI indicators
        if (!hasGemini || !hasOpenrouter) {
            const legacyKey = settingsRes.data?.gemini_api_key;
            if (legacyKey) {
                if (legacyKey.startsWith('sk-or-')) hasOpenrouter = true;
                else hasGemini = true;
            }
        }
        
        return c.json({
            success: true,
            primaryProvider: primarySecret?.value || 'openrouter',
            keysStatus: { 
                openrouter: hasOpenrouter, 
                gemini: hasGemini,
                primaryProvider: primarySecret?.value || 'openrouter' 
            }
        });
    } catch (e: any) {
        console.error("get-keys handler failed:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});

adminSettings.post("/save-key", async (c) => {
    try {
        let { provider, apiKey } = await c.req.json();
        if (!provider || !apiKey) return c.json({ success: false, error: "缺少必要參數" }, 400);

        apiKey = String(apiKey).trim();
        const supabase = await getSupabaseAdmin();
        const encryptedKey = encrypt(apiKey);
        
        // Ensure we handle the case where 'secrets' table might not exist yet
        const { error } = await supabase.from('secrets').upsert({ 
            key: provider, 
            value: encryptedKey,
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (error) {
            console.error(`Database error saving secret (${provider}):`, error);
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                return c.json({ 
                    success: false, 
                    error: "數據庫缺失 'secrets' 表。請前往「系統診斷」運行自動修復。" 
                }, 500);
            }
            throw error;
        }
        
        return c.json({ 
            success: true, 
            message: `密鑰已加密保存！` 
        });
    } catch (e: any) {
        console.error("Save key failed:", e);
        return c.json({ success: false, error: e.message || "保存失敗，請重試" }, 500);
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
        }, { onConflict: 'key' });
        
        if (error) {
            console.error(`Database error saving provider preference:`, error);
            if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
                return c.json({ 
                    success: false, 
                    error: "數據庫缺失 'secrets' 表。請前往「系統診斷」運行自動修復。" 
                }, 500);
            }
            throw error;
        }
        
        return c.json({ success: true });
    } catch (e: any) {
        console.error("Save provider failed:", e);
        return c.json({ success: false, error: e.message }, 500);
    }
});


