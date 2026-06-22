import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { db, secrets as secretsTable, settings as settingsTable } from '../../_lib/db/index.js';
import { eq, inArray, sql } from "drizzle-orm";
import { encrypt } from '../../_lib/encryption.js';

export const adminSettings = new Hono();

adminSettings.get("/get", async (c) => {
    try {
        const [settingsRes] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1)).limit(1);
        
        // Fetch secrets to merge legacy AI settings
        const secretsRes = await db.select().from(secretsTable);
        const secretsMap: Record<string, string> = {};
        for (const s of secretsRes) {
            secretsMap[s.key] = s.value || '';
        }

        const data = settingsRes ? {
            access_passcode: secretsMap['access_passcode'] || settingsRes.accessPasscode || '',
            logo_url: settingsRes.logoUrl,
            whatsapp_1: settingsRes.whatsapp1 || '',
            whatsapp_2: settingsRes.whatsapp2 || '',
            whatsapp_1_name: settingsRes.whatsapp1Name || '',
            whatsapp_2_name: settingsRes.whatsapp2Name || '',
            facebook: settingsRes.facebook || '',
            instagram: settingsRes.instagram || '',
            gemini_api_key: secretsMap['gemini'] || '',
            agnes_api_key: secretsMap['agnes'] || '',
            openrouter_api_key: secretsMap['openrouter'] || '',
            custom_model: secretsMap['openrouter_model'] || secretsMap['gemini_model'] || ''
        } : {};

        return c.json({ success: true, data });
    } catch (e: unknown) {
        return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

adminSettings.get("/get-keys", async (c) => {
    try {
        const keysToFetch = ['openrouter', 'agnes', 'PRIMARY_AI_PROVIDER', 'openrouter_model', 'agnes_model'];
        const secretsRes = await db.select()
            .from(secretsTable)
            .where(inArray(secretsTable.key, keysToFetch));

        const config: Record<string, string> = {};
        secretsRes.forEach((s) => { config[s.key] = s.value || ''; });
        
        let hasOpenrouter = !!config.openrouter;
        let hasAgnes = !!config.agnes;
        const primarySecret = config.PRIMARY_AI_PROVIDER || 'openrouter';

        // Fallback for UI indicators
        if (!hasAgnes || !hasOpenrouter) {
            const [settingsRes]: any[] = await db.select({
                openrouterModel: settingsTable.openrouterModel,
                agnesModel: settingsTable.agnesModel
            })
            .from(settingsTable)
            .where(eq(settingsTable.id, 1))
            .limit(1);

            if (settingsRes?.openrouterModel) hasOpenrouter = true;
            if (settingsRes?.agnesModel) hasAgnes = true;
        }
        
        return c.json({
            success: true,
            primaryProvider: primarySecret,
            customModel: '', // Deprecated
            currentModel: 'gemini-2.0-flash-exp', // Deprecated
            keysStatus: { 
                openrouter: hasOpenrouter, 
                agnes: hasAgnes,
                primaryProvider: primarySecret,
                openrouter_model: config.openrouter_model || '',
                agnes_model: config.agnes_model || ''
            }
        });
    } catch (e: unknown) {
        logger.error("get-keys handler failed:", e);
        return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

adminSettings.post("/save-key", async (c) => {
    try {
        let { provider, apiKey } = await c.req.json();
        if (!provider || !apiKey) return c.json({ success: false, error: "缺少必要參數" }, 400);

        apiKey = String(apiKey).trim();
        const encryptedKey = encrypt(apiKey);
        
        await db.insert(secretsTable).values({ 
            key: provider, 
            value: encryptedKey,
            updatedAt: new Date()
        }).onConflictDoUpdate({
            target: secretsTable.key,
            set: { 
                value: encryptedKey,
                updatedAt: new Date()
            }
        });

        return c.json({ 
            success: true, 
            message: `密鑰已加密保存！` 
        });
    } catch (e: unknown) {
        logger.error("Save key failed:", e);
        return c.json({ success: false, error: (e as Error).message || "保存失敗，請重試" }, 500);
    }
});

adminSettings.post("/save-model", async (c) => {
    try {
        const { provider, model } = await c.req.json();
        const key = `${provider}_model`;
        
        await db.insert(secretsTable).values({ 
            key, 
            value: model, 
            updatedAt: new Date() 
        }).onConflictDoUpdate({
            target: secretsTable.key,
            set: { 
                value: model, 
                updatedAt: new Date() 
            }
        });
            
        return c.json({ success: true });
    } catch (e: unknown) {
        logger.error("Save model failed:", e);
        return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

adminSettings.post("/save-provider", async (c) => {
    try {
        const { provider } = await c.req.json();
        if (!provider) {
            return c.json({ success: false, error: "Missing provider" }, 400);
        }

        await db.insert(secretsTable).values({ 
            key: 'PRIMARY_AI_PROVIDER', 
            value: provider,
            updatedAt: new Date()
        }).onConflictDoUpdate({
            target: secretsTable.key,
            set: { 
                value: provider,
                updatedAt: new Date()
            }
        });
        
        return c.json({ success: true });
    } catch (e: unknown) {
        logger.error("Save provider failed:", e);
        return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

adminSettings.post("/save-settings", async (c) => {
    try {
        const { settingsPayload } = await c.req.json();
        
        // Define allowed keys from settingsTable to avoid injecting non-existent columns (like gemini_api_key)
        const allowedKeys = ['id', 'logoUrl', 'whatsapp1', 'whatsapp2', 'whatsapp1Name', 'whatsapp2Name', 'categoriesJson', 'tagsJson', 'manufacturersJson', 'primaryColor', 'backgroundColor', 'accentColor', 'contactEmail', 'instagram', 'facebook', 'accessPasscode', 'passcodeEnabled', 'hotTagThreshold', 'hotTagsCount', 'openrouterModel', 'agnesModel'];

        // Map frontend fields (snake_case) to Drizzle fields (camelCase)
        const mappedPayload: any = {};
        for (const [key, value] of Object.entries(settingsPayload)) {
            const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            if (allowedKeys.includes(camelKey)) {
                mappedPayload[camelKey] = value;
            } else {
                logger.debug(`[save-settings] Ignoring non-schema key: ${key} -> ${camelKey}`);
            }
        }

        // Always ensure ID is 1
        mappedPayload.id = 1;

        await db.insert(settingsTable).values(mappedPayload).onConflictDoUpdate({
            target: settingsTable.id,
            set: mappedPayload
        });
        
        return c.json({ success: true });
    } catch (e: unknown) {
        return c.json({ success: false, error: (e as Error).message }, 500);
    }
});

adminSettings.post("/upsert-logo", async (c) => {
    try {
        const { url } = await c.req.json();
        await db.insert(settingsTable).values({ id: 1, logoUrl: url }).onConflictDoUpdate({
            target: settingsTable.id,
            set: { logoUrl: url }
        });
        return c.json({ success: true });
    } catch (e: unknown) {
        return c.json({ success: false, error: (e as Error).message }, 500);
    }
});


