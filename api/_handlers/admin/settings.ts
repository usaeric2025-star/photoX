import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { db, secrets as secretsTable, settings as settingsTable } from "@/db/index";
import { eq, inArray } from "drizzle-orm";
import { encrypt } from '../../_lib/encryption.js';

export const adminSettings = new Hono();

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
            const settingsRes = await db.query.settings.findFirst({
                columns: { geminiApiKey: true },
                where: eq(settingsTable.id, 1)
            });
            const legacyKey = settingsRes?.geminiApiKey;
            if (legacyKey) {
                if (legacyKey.startsWith('sk-or-')) hasOpenrouter = true;
                else hasAgnes = true;
            }
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
        
        // Map frontend fields (snake_case) to Drizzle fields (camelCase)
        const mappedPayload: any = {};
        for (const [key, value] of Object.entries(settingsPayload)) {
            const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            mappedPayload[camelKey] = value;
        }

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


