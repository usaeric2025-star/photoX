import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';

export const publicAuth = new Hono();

const handler = async (c: any) => {
    logger.info("Fetching auth info...");
    
    try {
        const passcodeRes = await db.select().from(schema.secrets).where(eq(schema.secrets.key, 'access_passcode')).limit(1)
            .then(res => { logger.info("Secrets fetched"); return res[0] || null; })
            .catch(e => { logger.error("Secrets table fetch failed:", e); return null; });
            
        const settingsRes = await db.select({
            passcodeEnabled: schema.settings.passcodeEnabled,
            accessPasscode: schema.settings.accessPasscode,
        }).from(schema.settings).where(eq(schema.settings.id, 1)).limit(1)
            .then(res => { logger.info("Settings auth fetched"); return res[0] || null; })
            .catch(e => { logger.error("Settings auth fetch failed:", e); return null; });

        const data = {
            passcode_enabled: settingsRes?.passcodeEnabled ?? false,
            access_passcode: passcodeRes?.value || settingsRes?.accessPasscode || '',
        };

        return c.json({ success: true, data });
    } catch (e) {
        logger.error("Failed to fetch auth info:", e);
        return c.json({ success: false, data: { passcode_enabled: false, access_passcode: '' } });
    }
};

publicAuth.get("/", handler);
publicAuth.get("", handler);
