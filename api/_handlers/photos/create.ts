import { Hono } from 'hono';
import { successResponse } from '../../_lib/response.js';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { sanitizePhotoPayload } from './sanitize.js';
import { upsertPhoto, createAiAuditLog } from '../../_lib/db/queries/photos.js';
import { getGroupById } from '../../_lib/db/queries/groups.js';
import { getCategoryById } from '../../_lib/db/queries/categories.js';
import { getManufacturerById } from '../../_lib/db/queries/manufacturers.js';
import { errorFactory } from '../../_lib/error/factory.js';
import { furnitureItems, systemLogs } from '../../_lib/db/index.js';

export const createRoutes = new Hono()
  .post('/upsert', async (c) => {
    const { payload } = await c.req.json() as { payload: Record<string, unknown> };

    const crypto = await import('node:crypto');
    // Ensure ID exists and is a valid UUID
    if (!payload.id || (typeof payload.id === 'string' && payload.id.startsWith('temp-'))) {
        payload.id = crypto.randomUUID();
    }

    // Fix userId if missing
    if (!payload.userId || payload.userId === 'staff') {
        payload.userId = '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    // Force intercept base64
    if (payload.imageUrl && (payload.imageUrl as string).startsWith('data:image/')) {
        throw errorFactory.create({ message: 'image_url 不接受 base64，請先上傳檔案', status: 400 });
    }

    // Title limit and suffix cleaning
    if (payload.name) {
        if (typeof payload.name === 'string') {
            payload.name = payload.name.replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, '').trim();
            if ((payload.name as string).length > 200) throw errorFactory.create({ message: '標題超過 200 字上限', status: 400 });
        } else if (payload.name && typeof payload.name === 'object') {
            const obj = payload.name as Record<string, string>;
            payload.name = (obj.zh || obj.en || obj.ms || "").replace(/\.(jpg|jpeg|png|webp|gif|bmp)$/i, '').trim();
        }
    }

    const mappedPayload = sanitizePhotoPayload(payload);

    // Validate foreign keys
    if (mappedPayload.groupId) {
        const group = await getGroupById(mappedPayload.groupId as string);
        if (!group) mappedPayload.groupId = null;
    }
    if (mappedPayload.categoryId) {
        const cat = await getCategoryById(mappedPayload.categoryId as number);
        if (!cat) mappedPayload.categoryId = null;
    }
    if (mappedPayload.manufacturerId) {
        const man = await getManufacturerById(mappedPayload.manufacturerId as string);
        if (!man) mappedPayload.manufacturerId = null;
    }

    delete mappedPayload.createdAt;
    delete mappedPayload.updatedAt;

    const insertPayload = {
        ...mappedPayload,
        imageUrl: (mappedPayload.imageUrl as string | null) || 'https://placeholder.com/placeholder.png',
        createdAt: new Date(),
        updatedAt: new Date()
    } as typeof furnitureItems.$inferInsert;

    const results = await upsertPhoto(insertPayload);
    const data = results[0] || null;

    if (payload.groupId && payload.groupId !== 'null' && payload.groupId !== 'undefined') {
      await syncGroupCoversAndCount([String(payload.groupId)]);
    }

    await refreshPhotosView();
    return successResponse(c, data);
  })
  .post('/ai-result', async (c) => {
    const { payload } = await c.req.json() as { payload: Record<string, unknown> };
    const [data] = await createAiAuditLog({
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
    } as typeof systemLogs.$inferInsert);
    
    return successResponse(c, data);
  });
