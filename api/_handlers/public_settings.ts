import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import { sql } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';

export const publicSettings = new Hono();

publicSettings.get("/", async (c) => {
    try {
        const [settingsRes]: any[] = await db.execute(sql`SELECT * FROM settings WHERE id = 1 LIMIT 1`);
        
        if (!settingsRes) {
            return c.json({ success: true, data: {} });
        }

        // Return ONLY non-sensitive data
        const data = {
            logo_url: settingsRes.logo_url,
            whatsapp_1: settingsRes.whatsapp_1,
            whatsapp_2: settingsRes.whatsapp_2,
            whatsapp_1_name: settingsRes.whatsapp_1_name,
            whatsapp_2_name: settingsRes.whatsapp_2_name,
            passcode_enabled: settingsRes.passcode_enabled,
            access_passcode: settingsRes.access_passcode, // Still need this for frontend passcode check if applicable
            // Do NOT return API keys here
        };

        return c.json({ success: true, data });
    } catch (e: unknown) {
        logger.error("Public settings fetch failed:", e);
        return c.json({ success: false, error: (e as Error).message }, 500);
    }
});
