import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';
import { withTimeout, TIMEOUTS } from '../_lib/utils/timeout.js';

export const publicAuth = new Hono();

const handler = async (c: any) => {
    logger.info("Fetching auth info...");
    
    try {
        const passcodeResPromise = db.select().from(schema.secrets).where(eq(schema.secrets.key, 'access_passcode')).limit(1).execute();
        const settingsResPromise = db.select({
            passcodeEnabled: schema.settings.passcodeEnabled,
            accessPasscode: schema.settings.accessPasscode,
        }).from(schema.settings).where(eq(schema.settings.id, 1)).limit(1).execute();

        const [passcodeRes, settingsRes] = await Promise.all([
            withTimeout(passcodeResPromise, TIMEOUTS.DB_QUERY).catch(e => { logger.error("passcode query failed or timed out", e); return []; }),
            withTimeout(settingsResPromise, TIMEOUTS.DB_QUERY).catch(e => { logger.error("settings query failed or timed out", e); return []; })
        ]);

        const data = {
            passcode_enabled: settingsRes[0]?.passcodeEnabled ?? false,
            access_passcode: (passcodeRes[0] as any)?.value || settingsRes[0]?.accessPasscode || '',
        };

        return c.json({ success: true, data });
    } catch (e) {
        logger.error("Failed to fetch auth info:", e);
        return c.json({ success: false, data: { passcode_enabled: false, access_passcode: '' } });
    }
};

publicAuth.get("/", handler);
publicAuth.get("", handler);
