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
    const requestId = crypto.randomUUID().slice(0, 8);
    const now = Date.now();
    
    // 1. Ultra-fast Memory Cache
    if (settingsCache && now - settingsCacheTime < 10 * 60 * 1000) {
        return c.json({ success: true, data: settingsCache });
    }

    try {
        const start = Date.now();
        
        const settingsPromise = db.select({
            id: schema.settings.id,
            logoUrl: schema.settings.logoUrl,
            whatsapp1: schema.settings.whatsapp1,
            whatsapp2: schema.settings.whatsapp2,
            whatsapp1Name: schema.settings.whatsapp1Name,
            whatsapp2Name: schema.settings.whatsapp2Name,
        }).from(schema.settings).where(eq(schema.settings.id, 1)).limit(1).execute();

        const settingsResArray = await withTimeout(
            settingsPromise, 
            TIMEOUTS.PUBLIC_META, 
            'Public Settings DB Fetch'
        ).catch((e: any) => {
            logger.error(`[Settings-${requestId}] DB Timeout/Error, using fallback:`, e.message);
            return [];
        });
        
        const settingsRes = settingsResArray[0] || null;

        // Return ONLY non-sensitive data
        const data = {
            logoUrl: settingsRes?.logoUrl || 'https://vbpnlkeweqkjufijtdph.supabase.co/storage/v1/object/public/furniture_images/app/logo-1777046441324.webp',
            whatsapp1: settingsRes?.whatsapp1 || '601111280883',
            whatsapp2: settingsRes?.whatsapp2 || '601130308865',
            whatsapp1Name: settingsRes?.whatsapp1Name || 'Auntie Shery',
            whatsapp2Name: settingsRes?.whatsapp2Name || 'Company',
            facebook: '',
            instagram: '',
            manufacturers: [], 
            tags: [],          
        };

        // Update Cache
        settingsCache = data;
        settingsCacheTime = now;

        logger.info(`[Settings-${requestId}] Resolved in ${Date.now() - start}ms`);
        return c.json({ success: true, data });
    } catch (e) {
        logger.error(`[Settings-${requestId}] Critical Failure:`, e);
        return c.json({ 
            success: true, 
            data: {
                logoUrl: 'https://vbpnlkeweqkjufijtdph.supabase.co/storage/v1/object/public/furniture_images/app/logo-1777046441324.webp',
                whatsapp1: '601111280883',
                whatsapp1Name: 'Auntie Shery',
            }
        });
    }
};

publicSettings.get("/", handler);
publicSettings.get("", handler);


