import { logger } from '../../_lib/logger.js';
import { Hono } from 'hono';
import * as v from 'valibot';
import { 
    getGlobalSettings, 
    getSecretsByKeys, 
    getAllSecrets, 
    upsertSecret, 
    upsertSettings 
} from '../../_lib/db/queries/settings.js';
import { encrypt } from '../../_lib/encryption.js';
import { successResponse } from '../../_lib/response.js';
import { clearSettingsCache } from '../public_settings.js';
import { toCamelCaseKeys } from '../../_lib/utils.js';
import { errorFactory } from '../../_lib/error/factory.js';

export const adminSettings = new Hono()
  .get("/get", async (c) => {
    const settingsRes = await getGlobalSettings();
    const secretsRes = await getAllSecrets();
    
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
})
.get("/get-keys", async (c) => {
    const keysToFetch = ['openrouter', 'agnes', 'PRIMARY_AI_PROVIDER', 'openrouter_model', 'agnes_model'];
    const secretsRes = await getSecretsByKeys(keysToFetch);

    const config: Record<string, string> = {};
    secretsRes.forEach((s) => { config[s.key] = s.value || ''; });
    
    let hasOpenrouter = !!config.openrouter;
    let hasAgnes = !!config.agnes;
    const primarySecret = config.PRIMARY_AI_PROVIDER || 'openrouter';

    if (!hasAgnes || !hasOpenrouter) {
        const settingsRes = await getGlobalSettings();
        if (settingsRes?.openrouterModel) hasOpenrouter = true;
        if (settingsRes?.agnesModel) hasAgnes = true;
    }
    
    return successResponse(c, {
        primaryProvider: primarySecret,
        customModel: '',
        currentModel: 'gemini-2.0-flash-exp',
        keysStatus: { 
            openrouter: hasOpenrouter, 
            agnes: hasAgnes,
            primaryProvider: primarySecret,
            openrouter_model: config.openrouter_model || '',
            agnes_model: config.agnes_model || ''
        }
    });
})
.post("/save-key", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ provider: v.string(), apiKey: v.string() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    
    const { provider, apiKey } = check.output;
    const encryptedKey = encrypt(apiKey.trim());
    
    await upsertSecret(provider, encryptedKey);

    return successResponse(c, null, { message: `密鑰已加密保存！` });
})
.post("/save-model", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ provider: v.string(), model: v.string() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);

    const { provider, model } = check.output;
    await upsertSecret(`${provider}_model`, model);
    return successResponse(c, null);
})
.post("/save-provider", async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ provider: v.string() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);

    await upsertSecret('PRIMARY_AI_PROVIDER', check.output.provider);
    return successResponse(c, null);
})
.post("/save-settings", async (c) => {
    const body = await c.req.json();
    const { settingsPayload } = body as { settingsPayload: Record<string, unknown> };
    
    const allowedKeys = ['id', 'logoUrl', 'whatsapp1', 'whatsapp2', 'whatsapp1Name', 'whatsapp2Name', 'accessPasscode', 'passcodeEnabled', 'hotTagThreshold', 'hotTagsCount', 'openrouterModel', 'agnesModel'];

    const mappedPayload = toCamelCaseKeys<Record<string, unknown>>(settingsPayload);
    const filteredPayload: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(mappedPayload)) {
        if (allowedKeys.includes(key)) {
            filteredPayload[key] = value;
        }
    }

    await upsertSettings(1, filteredPayload);
    
    if (settingsPayload.app_name !== undefined) {
        await upsertSecret('site_name', settingsPayload.app_name as string);
    }
    
    clearSettingsCache();
    return successResponse(c, null);
})
.post("/upsert-logo", async (c) => {
    const { url } = await c.req.json();
    await upsertSettings(1, { logoUrl: url });
    clearSettingsCache();
    return successResponse(c, null);
});


