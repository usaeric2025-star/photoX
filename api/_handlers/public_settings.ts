import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';
import { errorResponse, successResponse } from '../_lib/response.js';
import { withTimeout, TIMEOUTS } from '../_lib/utils/timeout.js';

export const publicSettings = new Hono();

let settingsCache: any = null;
let settingsCacheTime = 0;

export function clearSettingsCache() {
    logger.info('[Settings Cache] Cleared public settings cache');
    settingsCache = null;
    settingsCacheTime = 0;
}

const handler = async (c: any) => {
    const requestId = crypto.randomUUID().slice(0, 8);
    const now = Date.now();
    
    // 1. Ultra-fast Memory Cache
    if (settingsCache && now - settingsCacheTime < 30 * 60 * 1000) {
        return successResponse(c, settingsCache);
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
            passcodeEnabled: schema.settings.passcodeEnabled,
            accessPasscode: schema.settings.accessPasscode,
        }).from(schema.settings).where(eq(schema.settings.id, 1)).limit(1).execute();

        const siteNamePromise = db.select({
            value: schema.secrets.value
        }).from(schema.secrets).where(eq(schema.secrets.key, 'site_name')).limit(1).execute();

        const passcodePromise = db.select({
            value: schema.secrets.value
        }).from(schema.secrets).where(eq(schema.secrets.key, 'access_passcode')).limit(1).execute();

        const [settingsResArray, siteNameResArray, passcodeResArray] = await Promise.all([
            withTimeout(settingsPromise, TIMEOUTS.PUBLIC_META, 'Public Settings DB Fetch').catch((e: any) => []),
            withTimeout(siteNamePromise, TIMEOUTS.PUBLIC_META, 'Public SiteName DB Fetch').catch((e: any) => []),
            withTimeout(passcodePromise, TIMEOUTS.PUBLIC_META, 'Public Passcode DB Fetch').catch((e: any) => [])
        ]);
        
        const settingsRes = settingsResArray[0] || null;
        const siteName = siteNameResArray[0]?.value || 'PhotoX';
        const accessPasscode = passcodeResArray[0]?.value || settingsRes?.accessPasscode || 'a123456';
        const passcodeEnabled = settingsRes?.passcodeEnabled ?? true;

        // Return ONLY non-sensitive data
        const data = {
            appName: siteName,
            logoUrl: settingsRes?.logoUrl || 'https://vbpnlkeweqkjufijtdph.supabase.co/storage/v1/object/public/furniture_images/app/logo-1777046441324.webp',
            whatsapp1: settingsRes?.whatsapp1 || '601111280883',
            whatsapp2: settingsRes?.whatsapp2 || '601130308865',
            whatsapp1Name: settingsRes?.whatsapp1Name || 'Auntie Shery',
            whatsapp2Name: settingsRes?.whatsapp2Name || 'Company',
            manufacturers: [], 
            tags: [],
            passcodeEnabled,
            accessPasscode,
        };

        // Update Cache
        settingsCache = data;
        settingsCacheTime = now;

        logger.info(`[Settings-${requestId}] Resolved in ${Date.now() - start}ms`);
        return successResponse(c, data);
    } catch (e) {
        logger.error(`[Settings-${requestId}] Critical Failure:`, e);
        return successResponse(c, {
            logoUrl: 'https://vbpnlkeweqkjufijtdph.supabase.co/storage/v1/object/public/furniture_images/app/logo-1777046441324.webp',
            whatsapp1: '601111280883',
            whatsapp1Name: 'Auntie Shery',
            passcodeEnabled: true,
            accessPasscode: 'a123456'
        });
    }
};

publicSettings.get("/", handler);
publicSettings.get("", handler);


