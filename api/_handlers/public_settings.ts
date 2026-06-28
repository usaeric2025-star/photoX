import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';
import { errorResponse } from '../_lib/response.js';

export const publicSettings = new Hono();

const handler = async (c: any) => {
    // Use safer query approach - if it fails, fallback to empty
    let settingsRes: typeof schema.settings.$inferSelect | null = null;
    try {
        [settingsRes] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1)).limit(1);
    } catch (e) {
        logger.warn("Settings table fetch failed (likely schema mismatch):", e);
    }

    let manufacturersRes: typeof schema.manufacturers.$inferSelect[] = [];
    try {
        manufacturersRes = await db.select().from(schema.manufacturers).orderBy(schema.manufacturers.name);
    } catch (e) {
        logger.warn("Manufacturers table fetch failed (likely schema mismatch):", e);
    }

    let tagsRes: typeof schema.tags.$inferSelect[] = [];
    try {
        tagsRes = await db.select().from(schema.tags);
    } catch (e) {
        logger.warn("Tags table fetch failed (likely schema mismatch):", e);
    }
    
    let passcodeRes: typeof schema.secrets.$inferSelect | null = null;
    try {
        [passcodeRes] = await db.select().from(schema.secrets).where(eq(schema.secrets.key, 'access_passcode')).limit(1);
    } catch (e) {
        logger.warn("Secrets table fetch failed:", e);
    }

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
        manufacturers: manufacturersRes,
        tags: tagsRes,
        // Do NOT return API keys here
    };

    return c.json({ success: true, data });
};

publicSettings.get("/", handler);
publicSettings.get("", handler);

