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

    logger.info('[Upsert] Raw payload:', JSON.stringify(payload));

    // Fix user_id if it is 'staff' or missing
    if (!payload.user_id || payload.user_id === 'staff') {
        // Fallback id
        payload.user_id = '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    const mappedPayload: Record<string, unknown> = {};
    try {
        const camelPayload = keysToCamel<Record<string, any>>(payload);

        for (const [key, val] of Object.entries(camelPayload)) {
            // Skip createdAt and updatedAt from client to avoid type/mismatch errors and let backend generate them
            if (['createdAt', 'updatedAt'].includes(key)) continue;

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

        const { id, ...updatePayloadData } = mappedPayload;

        const insertPayload = {
            ...mappedPayload,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const updatePayload = {
            ...updatePayloadData,
            updatedAt: new Date()
        };

        const results = await db.insert(furnitureItems)
            .values([insertPayload as typeof furnitureItems.$inferInsert])
            .onConflictDoUpdate({
                target: furnitureItems.id,
                set: updatePayload as typeof furnitureItems.$inferInsert
            })
            .returning({ id: furnitureItems.id });

        const data = results[0] || null;

        if (payload.group_id) {
          await syncGroupCoversAndCount([String(payload.group_id)]);
        }

        return c.json({ success: true, data });
    } catch (error: unknown) {
        logger.error('[UpsertPhoto] Database error during upsert. Mapped payload fields: ' + Object.entries(mappedPayload).map(([k, v]) => `${k}: ${v === null ? 'null' : typeof v} (${v instanceof Date ? 'Date' : 'not Date'})`).join(', '));
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
