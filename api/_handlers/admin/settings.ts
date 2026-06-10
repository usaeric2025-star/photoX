import { Hono } from 'hono';
import { getSupabaseAdmin } from "../../_lib/supabase.js";
import { encrypt } from '../../_lib/encryption.js';

export const adminSettings = new Hono();

adminSettings.get("/get-keys", async (c) => {
    try {
        const supabase = await getSupabaseAdmin();
        
        // 1. Try to get from secrets table (New system)
        const { data: secrets, error: secretsErr } = await supabase.from('secrets').select('key, value');
        if (secretsErr) console.warn("Secrets table query warning (might not exist yet):", secretsErr.message);

        const configuredProviders = secrets?.map((s: any) => s.key) || [];
        
        let hasOpenrouter = configuredProviders.includes('openrouter');
        let hasGemini = configuredProviders.includes('gemini');
        
        const primarySecret = secrets?.find((s: any) => s.key === 'PRIMARY_AI_PROVIDER');
        
        // 2. Fallback to settings table (Legacy system) if not found in secrets
        if (!hasGemini || !hasOpenrouter) {
            const { data: settings } = await supabase.from('settings').select('gemini_api_key').single();
            if (settings?.gemini_api_key) {
                // If it's the only one we have, we might treat it as gemini or openrouter depending on format
                // In PhotoX, gemini_api_key was used for both via different logic
                if (settings.gemini_api_key.startsWith('sk-or-')) {
                   if (!hasOpenrouter) hasOpenrouter = true;
                } else {
                   if (!hasGemini) hasGemini = true;
                }
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


