import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';
import { errorResponse } from '../_lib/response.js';
import { withTimeout, TIMEOUTS } from '../_lib/utils/timeout.js';

export const publicSettings = new Hono();

const handler = async (c: any) => {
    const requestId = crypto.randomUUID();
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

    const settingsResArray = await withTimeout(settingsPromise, TIMEOUTS.DB_QUERY, 'DB Query Settings table (ID=1)').catch((e: any) => {
        logger.error(`[Settings-${requestId}] Settings table fetch failed or timed out:`, e);
        return [];
    });
    
    const settingsRes = settingsResArray[0] || null;

    logger.info(`[Settings-${requestId}] Fetch completed in ${Date.now() - start}ms`);

    // Return ONLY non-sensitive data
    const data = {
        logo_url: settingsRes?.logoUrl || '',
        whatsapp_1: settingsRes?.whatsapp1 || '',
        whatsapp_2: settingsRes?.whatsapp2 || '',
        whatsapp_1_name: settingsRes?.whatsapp1Name || '',
        whatsapp_2_name: settingsRes?.whatsapp2Name || '',
        facebook: '',
        instagram: '',
        manufacturers: [], 
        tags: [],          
    };

    return c.json({ success: true, data });
};

publicSettings.get("/", handler);
publicSettings.get("", handler);

