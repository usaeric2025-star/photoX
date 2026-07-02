import { Hono } from 'hono';
import { errorResponse, successResponse } from '../../_lib/response.js';
import { db, furnitureItems, systemLogs } from '../../_lib/db/index.js';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { ErrorFactory } from '../../../src/lib/error/ErrorFactory.js';
import { sanitizePhotoPayload } from './sanitize.js';

export const createHandler = (app: Hono) => {
  app.post('/upsert', async (c) => {
    const { payload } = await c.req.json() as { payload: Record<string, unknown> };

    const crypto = await import('node:crypto');
    // Ensure ID exists and is a valid UUID (if present, ignore temp IDs)
    if (!payload.id || (typeof payload.id === 'string' && payload.id.startsWith('temp-'))) {
        payload.id = crypto.randomUUID();
    }

    // Fix userId if it is 'staff' or missing
    if (!payload.userId || payload.userId === 'staff') {
        // Fallback id
        payload.userId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    try {
        // ✅ 強制攔截 base64
        if (payload.imageUrl && (payload.imageUrl as string).startsWith('data:image/')) {
            throw new Error('image_url 不接受 base64，請先上傳檔案');
        }

        // ✅ 強制限制標題長度
        if (payload.name) {
            let nameStr = '';
            if (typeof payload.name === 'string') {
                nameStr = payload.name;
            } else if (payload.name && typeof payload.name === 'object') {
                const obj = payload.name as any;
                nameStr = obj.zh || obj.en || obj.ms || '';
            }

            if (nameStr.length > 200) throw new Error('標題超過 200 字上限');
            payload.name = nameStr;
        }

        // Apply our sanitized logic to cleanse relations and avoid SQL constraints
        const mappedPayload = sanitizePhotoPayload(payload);

        // Validate foreign keys to fallback instead of failing
        const { eq } = await import('drizzle-orm');
        const { groups, categories, manufacturers } = await import('../../_lib/db/schema.js');

        // 3. Ensure Group Exists if groupId is provided
        if (mappedPayload.groupId) {
            const groupRows = await db.select({ id: groups.id }).from(groups).where(eq(groups.id, mappedPayload.groupId)).limit(1);
            if (groupRows.length === 0) {
                // Fallback to null if group not found
                mappedPayload.groupId = null;
            }
        }
        if (mappedPayload.categoryId) {
            const catRows = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, mappedPayload.categoryId)).limit(1);
            if (catRows.length === 0) mappedPayload.categoryId = null;
        }
        if (mappedPayload.manufacturerId) {
            const manRows = await db.select({ id: manufacturers.id }).from(manufacturers).where(eq(manufacturers.id, mappedPayload.manufacturerId)).limit(1);
            if (manRows.length === 0) mappedPayload.manufacturerId = null;
        }

        // Remove createdAt/updatedAt if accidentally passed from client
        delete mappedPayload.createdAt;
        delete mappedPayload.updatedAt;

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
                const code = err.code || (err.cause && err.cause.code);
                if (code === '23503') {
                    throw new Error(`Foreign Key Violation: Make sure the referenced Category, Manufacturer, or Group exists.`);
                }
                throw err;
            });

        const data = results[0] || null;

        if (payload.groupId && payload.groupId !== 'null' && payload.groupId !== 'undefined') {
          await syncGroupCoversAndCount([String(payload.groupId)]);
        }

        await refreshPhotosView();

        return successResponse(c, data);
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
        
        const { errorFactory } = await import('../../_lib/error/factory.js');
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
        
        return successResponse(c, data);
    } catch (error: unknown) {
        const { errorFactory } = await import('../../_lib/error/factory.js');
        throw errorFactory.wrap(error, 'api./api/photos/ai-result', 'DB_ERROR');
    }
  });
};
