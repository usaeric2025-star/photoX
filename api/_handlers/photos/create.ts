import { Hono } from 'hono';
import { db, furnitureItems, systemLogs } from '../../_lib/db/index.js';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { logger } from '../../_lib/logger.js';
import { keysToCamel } from '../../_lib/casing.js';

export const createHandler = (app: Hono) => {
  app.post('/upsert', async (c) => {
    const { payload } = await c.req.json() as { payload: Record<string, unknown> };

    const crypto = await import('node:crypto');
    // Ensure ID exists
    if (!payload.id) {
        payload.id = crypto.randomUUID();
    }

    // Fix user_id if it is 'staff' or missing
    if (!payload.user_id || payload.user_id === 'staff') {
        // Fallback id
        payload.user_id = '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    try {
        const camelPayload = keysToCamel<Record<string, any>>(payload);
        const mappedPayload: Record<string, unknown> = {};

        for (const [key, val] of Object.entries(camelPayload)) {
            if (['categoryId', 'groupId', 'manufacturerId'].includes(key)) {
                if (val === null || val === undefined || val === '' || val === 'null' || val === 'uncategorized' || val === 'undefined') {
                    mappedPayload[key] = null;
                } else if (key === 'categoryId') {
                    const parsed = typeof val === 'string' ? parseInt(val, 10) : Number(val);
                    mappedPayload[key] = isNaN(parsed) ? null : parsed;
                } else {
                    mappedPayload[key] = val;
                }
            } else {
                mappedPayload[key] = val;
            }
        }

        const results = await db.insert(furnitureItems)
            .values([mappedPayload as typeof furnitureItems.$inferInsert])
            .onConflictDoUpdate({
                target: furnitureItems.id,
                set: mappedPayload as typeof furnitureItems.$inferInsert
            })
            .returning({ id: furnitureItems.id });

        const data = results[0] || null;

        if (payload.group_id) {
          await syncGroupCoversAndCount([String(payload.group_id)]);
        }

        return c.json({ success: true, data });
    } catch (error: unknown) {
        logger.error('[UpsertPhoto] Database error during upsert', error);
        return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  });

  app.post('/ai-result', async (c) => {
    const { payload } = await c.req.json() as { payload: Record<string, unknown> };
    try {
        const [data] = await db.insert(systemLogs).values({
            message: `AI analysis completed for photo ${payload.photo_id}`,
            operation: 'analyze_photo',
            level: 'info',
            resource: String(payload.photo_id),
            metadata: {
                action: 'analyze_photo',
                photo_id: payload.photo_id,
                raw_result: payload.raw_result,
                parsed_data: payload.parsed_data
            },
            createdAt: payload.created_at ? new Date(payload.created_at as string) : new Date()
        }).returning();
        
        return c.json({ success: true, data });
    } catch (error: unknown) {
        return c.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, 500);
    }
  });
};
