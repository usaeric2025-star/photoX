import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';
import { withTimeout, TIMEOUTS } from '../_lib/utils/timeout.js';

export const publicAuth = new Hono();

export let authCache: any = null;
export let authCacheTime = 0;

export function clearAuthCache() {
    logger.info('[Auth Cache] Cleared public auth cache');
    authCache = null;
    authCacheTime = 0;
}

const handler = async (c: any) => {
    const requestId = crypto.randomUUID();
    const now = Date.now();

    if (authCache && now - authCacheTime < 5 * 60 * 1000) {
        logger.debug(`[Auth-${requestId}] Returning cached public auth info`);
        return c.json({ success: true, data: authCache });
    }

    logger.info(`[Auth-${requestId}] Starting fetch...`);
    const start = Date.now();
    
    try {
        const settingsRes = await withTimeout(
            db.select({
                passcodeEnabled: schema.settings.passcodeEnabled,
                accessPasscode: schema.settings.accessPasscode,
            }).from(schema.settings).where(eq(schema.settings.id, 1)).limit(1).execute(),
            TIMEOUTS.DB_QUERY,
            'DB Query Settings passcodeEnabled (ID=1)'
        ).catch(e => {
            logger.error(`[Auth-${requestId}] settings query failed or timed out`, e);
            return [];
        });

        const passcodeRes = await withTimeout(
            db.select().from(schema.secrets).where(eq(schema.secrets.key, 'access_passcode')).limit(1).execute(),
            TIMEOUTS.DB_QUERY,
            'DB Query Access Passcode secret'
        ).catch(e => {
            logger.error(`[Auth-${requestId}] passcode query failed or timed out`, e);
            return [];
        });

        const data = {
            passcodeEnabled: settingsRes[0]?.passcodeEnabled ?? false,
            accessPasscode: (passcodeRes[0] as any)?.value || settingsRes[0]?.accessPasscode || '',
        };

        logger.info(`[Auth-${requestId}] Fetch completed in ${Date.now() - start}ms`);

        authCache = data;
        authCacheTime = now;

        return c.json({ success: true, data });
    } catch (e) {
        logger.error(`[Auth-${requestId}] Failed to fetch auth info:`, e);
        return c.json({ success: false, data: { passcodeEnabled: false, accessPasscode: '' } });
    }
};

publicAuth.get("/", handler);
publicAuth.get("", handler);
