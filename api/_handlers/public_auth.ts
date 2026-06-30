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
    const requestId = crypto.randomUUID().slice(0, 8);
    const now = Date.now();

    // 1. Memory Cache Check (Extremely fast)
    if (authCache && now - authCacheTime < 10 * 60 * 1000) {
        return c.json({ success: true, data: authCache });
    }

    try {
        const start = Date.now();
        
        // 2. Parallel Database Query with Tight Timeout
        const fetchPromise = Promise.all([
            db.select({
                passcodeEnabled: schema.settings.passcodeEnabled,
                accessPasscode: schema.settings.accessPasscode,
            }).from(schema.settings).where(eq(schema.settings.id, 1)).limit(1).execute(),
            db.select().from(schema.secrets).where(eq(schema.secrets.key, 'access_passcode')).limit(1).execute()
        ]);

        const [settingsRes, passcodeRes] = await withTimeout(
            fetchPromise,
            TIMEOUTS.PUBLIC_META,
            'Public Auth DB Fetch'
        ).catch(e => {
            logger.error(`[Auth-${requestId}] DB Timeout/Error, using fallback:`, e.message);
            return [[], []]; // Return empty arrays to trigger default values
        });

        const data = {
            passcodeEnabled: settingsRes[0]?.passcodeEnabled ?? true, // Default to true for safety
            accessPasscode: (passcodeRes[0] as any)?.value || settingsRes[0]?.accessPasscode || 'a123456',
        };

        // Update Cache on success or partial fallback
        authCache = data;
        authCacheTime = now;

        logger.info(`[Auth-${requestId}] Resolved in ${Date.now() - start}ms`);
        return c.json({ success: true, data });
    } catch (e) {
        logger.error(`[Auth-${requestId}] Critical Failure:`, e);
        // Absolute fallback to prevent UI hanging
        return c.json({ 
            success: true, // Mark as true so frontend proceeds with defaults
            data: { passcodeEnabled: true, accessPasscode: 'a123456' } 
        });
    }
};

publicAuth.get("/", handler);
publicAuth.get("", handler);
