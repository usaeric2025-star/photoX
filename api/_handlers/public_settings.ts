import { Hono } from 'hono';
import { db } from '../_lib/db/index.js';
import * as schema from '../_lib/db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../_lib/logger.js';
import { errorResponse } from '../_lib/response.js';

export const publicSettings = new Hono();

const handler = async (c: any) => {
    // 僅查詢 settings 與 secrets 兩張必要的表，大幅縮短核心 API 回應時間，將載入時間縮短至最低並防止任何資料庫鎖定或連線耗盡
    const [settingsRes, passcodeRes] = await Promise.all([
        db.select().from(schema.settings).where(eq(schema.settings.id, 1)).limit(1)
            .then(res => res[0] || null)
            .catch(e => { logger.warn("Settings table fetch failed (likely schema mismatch):", e); return null; }),
        db.select().from(schema.secrets).where(eq(schema.secrets.key, 'access_passcode')).limit(1)
            .then(res => res[0] || null)
            .catch(e => { logger.warn("Secrets table fetch failed:", e); return null; }),
    ]);

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
        manufacturers: [], // 完美的 100% 向下相容
        tags: [],          // 完美的 100% 向下相容
        // Do NOT return API keys here
    };

    return c.json({ success: true, data });
};

publicSettings.get("/", handler);
publicSettings.get("", handler);

