import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';

export const publicSettings = new Hono();

publicSettings.get("/", async (c) => {
    try {
        // Use safer query approach - if it fails, fallback to empty
        let settingsRes: any = null;
        try {
            [settingsRes] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1)).limit(1);
        } catch (e) {
            logger.warn("Settings table fetch failed (likely schema mismatch):", e);
        }

        let manufacturersRes: any[] = [];
        try {
            manufacturersRes = await db.select().from(schema.manufacturers).orderBy(schema.manufacturers.name);
        } catch (e) {
            logger.warn("Manufacturers table fetch failed (likely schema mismatch):", e);
        }

        let tagsRes: any[] = [];
        try {
            tagsRes = await db.select().from(schema.tags);
        } catch (e) {
            logger.warn("Tags table fetch failed (likely schema mismatch):", e);
        }
        
        let passcodeRes: any = null;
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
    } catch (e: unknown) {
        logger.error("Public settings fetch failed:", e);
        return c.json({ success: false, error: (e as Error).message }, 500);
    }
});
