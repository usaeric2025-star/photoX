import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';
import { errorResponse } from '../_lib/response.js';
import { withTimeout, TIMEOUTS } from '../_lib/utils/timeout.js';

export const publicSettings = new Hono();

export let settingsCache: any = null;
export let settingsCacheTime = 0;

export function clearSettingsCache() {
    logger.info('[Settings Cache] Cleared public settings cache');
    settingsCache = null;
    settingsCacheTime = 0;
}

const handler = async (c: any) => {
    const requestId = crypto.randomUUID();
    const now = Date.now();
    
    if (settingsCache && now - settingsCacheTime < 5 * 60 * 1000) {
        logger.debug(`[Settings-${requestId}] Returning cached public settings`);
        return c.json({ success: true, data: settingsCache });
    }

    logger.info(`[Settings-${requestId}] Starting fetch...`);
    const start = Date.now();
    
    const settingsPromise = db.select({
        id: schema.settings.id,
        logoUrl: schema.settings.logoUrl,
        whatsapp1: schema.settings.whatsapp1,
        whatsapp2: schema.settings.whatsapp2,
        whatsapp1Name: schema.settings.whatsapp1Name,
        whatsapp2Name: schema.settings.whatsapp2Name,
    }).from(schema.settings).where(eq(schema.settings.id, 1)).limit(1).execute();

    // Prevent unhandled promise rejections on the underlying connection
    settingsPromise.catch((err) => {
        logger.warn("[DB-DRIVER] Settings query rejected or cancelled:", err.message || err);
    });

    const settingsResArray = await withTimeout(settingsPromise, TIMEOUTS.DB_QUERY, 'DB Query Settings table (ID=1)').catch((e: any) => {
        logger.error(`[Settings-${requestId}] Settings table fetch failed or timed out:`, e);
        return [];
    });
    
    const settingsRes = settingsResArray[0] || null;

    logger.info(`[Settings-${requestId}] Fetch completed in ${Date.now() - start}ms`);

    // Return ONLY non-sensitive data
    const data = {
        logoUrl: settingsRes?.logoUrl || '',
        whatsapp1: settingsRes?.whatsapp1 || '',
        whatsapp2: settingsRes?.whatsapp2 || '',
        whatsapp1Name: settingsRes?.whatsapp1Name || '',
        whatsapp2Name: settingsRes?.whatsapp2Name || '',
        facebook: '',
        instagram: '',
        manufacturers: [], 
        tags: [],          
    };

    settingsCache = data;
    settingsCacheTime = now;

    return c.json({ success: true, data });
};

publicSettings.get("/", handler);
publicSettings.get("", handler);


