import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';
import { errorResponse } from '../_lib/response.js';

export const publicSettings = new Hono();

const handler = async (c: any) => {
    logger.info("Fetching settings...");
    const [settingsRes, passcodeRes] = await Promise.all([
        db.select({
            id: schema.settings.id,
            logoUrl: schema.settings.logoUrl,
            whatsapp1: schema.settings.whatsapp1,
            whatsapp2: schema.settings.whatsapp2,
            whatsapp1Name: schema.settings.whatsapp1Name,
            whatsapp2Name: schema.settings.whatsapp2Name,
            facebook: schema.settings.facebook,
            instagram: schema.settings.instagram,
            passcodeEnabled: schema.settings.passcodeEnabled,
            accessPasscode: schema.settings.accessPasscode,
        }).from(schema.settings).where(eq(schema.settings.id, 1)).limit(1)
            .then(res => { logger.info("Settings fetched"); return res[0] || null; })
            .catch(e => { logger.error("Settings table fetch failed:", e); return null; }),
        db.select().from(schema.secrets).where(eq(schema.secrets.key, 'access_passcode')).limit(1)
            .then(res => { logger.info("Secrets fetched"); return res[0] || null; })
            .catch(e => { logger.error("Secrets table fetch failed:", e); return null; }),
    ]);
    logger.info("Fetching complete");

    // Return ONLY non-sensitive data
    const data = {
        logo_url: settingsRes?.logoUrl || '',
        whatsapp_1: settingsRes?.whatsapp1 || '',
        whatsapp_2: settingsRes?.whatsapp2 || '',
        whatsapp_1_name: settingsRes?.whatsapp1Name || '',
        whatsapp_2_name: settingsRes?.whatsapp2Name || '',
        facebook: settingsRes?.facebook || '',
        instagram: settingsRes?.instagram || '',
        passcode_enabled: settingsRes?.passcodeEnabled ?? false,
        access_passcode: passcodeRes?.value || settingsRes?.accessPasscode || '',
        manufacturers: [], // 完美的 100% 向下相容
        tags: [],          // 完美的 100% 向下相容
        // Do NOT return API keys here
    };

    return c.json({ success: true, data });
};

publicSettings.get("/", handler);
publicSettings.get("", handler);

