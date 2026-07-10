import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import { db, secrets as secretsTable, settings as settingsTable } from '../../_lib/db/index.js';
import { eq, inArray, sql } from "drizzle-orm";
import { encrypt } from '../../_lib/encryption.js';
import { errorResponse, successResponse } from '../../_lib/response.js';
import { clearSettingsCache } from '../public_settings.js';
import { toCamelCaseKeys } from '../../_lib/utils.js';
import { errorFactory } from '../../_lib/error/factory.js';

export const adminSettings = new Hono()
  .get("/get", async (c) => {
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
            app_name: secretsMap['site_name'] || 'PhotoX',
            agnes_api_key: secretsMap['agnes'] || '',
            openrouter_api_key: secretsMap['openrouter'] || ''
        } : {};

        return successResponse(c, data);
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.settings-get', 'DB_ERROR');
    }
})
.get("/get-keys", async (c) => {
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
            const [settingsRes] = await db.select({
                openrouterModel: settingsTable.openrouterModel,
                agnesModel: settingsTable.agnesModel
            })
            .from(settingsTable)
            .where(eq(settingsTable.id, 1))
            .limit(1);

            if (settingsRes?.openrouterModel) hasOpenrouter = true;
            if (settingsRes?.agnesModel) hasAgnes = true;
        }
        
        return successResponse(c, {
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
        throw errorFactory.wrap(e, 'admin.settings-get-keys', 'DB_ERROR');
    }
})
.post("/save-key", async (c) => {
    try {
        let { provider, apiKey } = await c.req.json();
        if (!provider || !apiKey) return errorResponse(c, "缺少必要參數", 400);

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

        return successResponse(c, null, { 
            message: `密鑰已加密保存！` 
        });
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.settings-save-key', 'DB_ERROR');
    }
})
.post("/save-model", async (c) => {
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
            
        return successResponse(c, null);
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.settings-save-model', 'DB_ERROR');
    }
})
.post("/save-provider", async (c) => {
    try {
        const { provider } = await c.req.json();
        if (!provider) {
            return errorResponse(c, "Missing provider", 400);
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
        
        return successResponse(c, null);
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.settings-save-provider', 'DB_ERROR');
    }
})
.post("/save-settings", async (c) => {
    try {
        const { settingsPayload } = await c.req.json();
        
        // Define allowed keys from settingsTable to avoid injecting non-existent columns (like gemini_api_key)
        const allowedKeys = ['id', 'logoUrl', 'whatsapp1', 'whatsapp2', 'whatsapp1Name', 'whatsapp2Name', 'accessPasscode', 'passcodeEnabled', 'hotTagThreshold', 'hotTagsCount', 'openrouterModel', 'agnesModel'];

        // Map frontend fields (snake_case) to Drizzle fields (camelCase)
        const mappedPayload = toCamelCaseKeys<Record<string, any>>(settingsPayload);
        const filteredPayload: Record<string, any> = {};
        
        for (const [key, value] of Object.entries(mappedPayload)) {
            if (allowedKeys.includes(key)) {
                filteredPayload[key] = value;
            } else {
                logger.debug(`[save-settings] Ignoring non-schema key: ${key}`);
            }
        }

        // Always ensure ID is 1
        filteredPayload.id = 1;

        const { id: _, ...updatePayload } = filteredPayload as typeof settingsTable.$inferInsert;

        await db.insert(settingsTable).values(filteredPayload as typeof settingsTable.$inferInsert).onConflictDoUpdate({
            target: settingsTable.id,
            set: updatePayload
        });
        
        if (settingsPayload.app_name !== undefined) {
             await db.insert(secretsTable).values({ key: 'site_name', value: settingsPayload.app_name as string }).onConflictDoUpdate({
                 target: secretsTable.key,
                 set: { value: settingsPayload.app_name as string }
             });
        }
        
        clearSettingsCache();
        return successResponse(c, null);
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.settings-save-settings', 'DB_ERROR');
    }
})
.post("/upsert-logo", async (c) => {
    try {
        const { url } = await c.req.json();
        await db.insert(settingsTable).values({ id: 1, logoUrl: url }).onConflictDoUpdate({
            target: settingsTable.id,
            set: { logoUrl: url }
        });
        clearSettingsCache();
        return successResponse(c, null);
    } catch (e: unknown) {
        throw errorFactory.wrap(e, 'admin.settings-upsert-logo', 'DB_ERROR');
    }
});


