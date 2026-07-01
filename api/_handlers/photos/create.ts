import { Hono } from 'hono';
import { db, furnitureItems, systemLogs } from '../../_lib/db/index.js';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { ErrorFactory } from '../../../src/lib/error/ErrorFactory.js';

export const createHandler = (app: Hono) => {
  app.post('/upsert', async (c) => {
    const { payload } = await c.req.json() as { payload: Record<string, unknown> };

    const crypto = await import('node:crypto');
    // Ensure ID exists
    if (!payload.id) {
        payload.id = crypto.randomUUID();
    }

    // Fix userId if it is 'staff' or missing
    if (!payload.userId || payload.userId === 'staff') {
        // Fallback id
        payload.userId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    const mappedPayload: Record<string, unknown> = {};
    try {
        // ✅ 強制攔截 base64
        if (payload.imageUrl && (payload.imageUrl as string).startsWith('data:image/')) {
            throw new Error('image_url 不接受 base64，請先上傳檔案');
        }

        // ✅ 強制限制標題長度
        if (payload.name) {
            let nameJson = payload.name;
            if (typeof payload.name === 'string' && (payload.name.startsWith('{') || payload.name.startsWith('['))) {
                try {
                    nameJson = JSON.parse(payload.name);
                } catch (e) {
                    // Not valid JSON
                }
            }

            if (typeof nameJson === 'string') {
                if (nameJson.length > 200) throw new Error('標題超過 200 字上限');
                payload.name = { zh: nameJson };
            } else if (nameJson && typeof nameJson === 'object') {
                for (const lang of ['zh', 'en', 'ms']) {
                   if ((nameJson as any)[lang] && String((nameJson as any)[lang]).length > 200) {
                       throw new Error(`標題(${lang})超過 200 字上限`);
                   }
                }
            }
        }

        for (const [key, val] of Object.entries(payload)) {
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
            imageUrl: (mappedPayload.imageUrl as string | null) || 'https://placeholder.com/placeholder.png',
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
            .returning({ id: furnitureItems.id })
            .catch(err => {
                if (err.code === '23503') {
                    throw new Error(`Group not found (FK Violation): ${payload.groupId}`);
                }
                throw err;
            });

        const data = results[0] || null;

        if (payload.groupId && payload.groupId !== 'null' && payload.groupId !== 'undefined') {
          await syncGroupCoversAndCount([String(payload.groupId)]);
        }

        await refreshPhotosView();

        return c.json({ success: true, data });
    } catch (error: unknown) {
        ErrorFactory.handle(error, { context: 'api./api/photos/upsert' });
        
        let errorMessage = 'Unknown database error';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error !== null && 'detail' in error) {
            errorMessage = (error as any).detail;
        } else {
            errorMessage = String(error);
        }
        
        const { errorFactory } = await import('../../_lib/error/AppError.js');
        throw errorFactory.wrap(new Error(errorMessage), 'api./api/photos/upsert', 'DB_ERROR');
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
        const { errorFactory } = await import('../../_lib/error/AppError.js');
        throw errorFactory.wrap(error, 'api./api/photos/ai-result', 'DB_ERROR');
    }
  });
};
