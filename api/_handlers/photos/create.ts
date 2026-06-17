import { Hono } from 'hono';
import { db, furnitureItems, systemLogs } from '@/db/index';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';

export const createHandler = (app: Hono) => {
  app.post('/upsert', async (c) => {
    const { payload } = await c.req.json() as { payload: Record<string, unknown> };

    // Fix user_id if it is 'staff' or missing
    if (!payload.user_id || payload.user_id === 'staff') {
        // Fallback id
        payload.user_id = '8ec53131-a589-4b50-beb4-6b5308541e1b';
    }

    try {
        const mappedPayload: Record<string, unknown> = {};
        const fieldMap: Record<string, string> = {
            id: 'id',
            user_id: 'userId',
            name: 'name',
            description: 'description',
            category_id: 'categoryId',
            manufacturer_id: 'manufacturerId',
            group_id: 'groupId',
            is_group_cover: 'isGroupCover',
            is_pinned: 'isPinned',
            image_url: 'imageUrl',
            image_hash: 'imageHash', 
            thumb_hash: 'thumbHash',
            price: 'price',
            note: 'note',
            type: 'type',
            is_hidden: 'isHidden',
            item_code: 'itemCode',
            manual_code: 'manualCode',
            model_number: 'modelNumber',
            dimensions: 'dimensions'
        };

        for (const [key, val] of Object.entries(payload)) {
            const mappedKey = fieldMap[key] || key;
            mappedPayload[mappedKey] = val;
        }

        const results = await db.insert(furnitureItems)
            .values(mappedPayload)
            .onConflictDoUpdate({
                target: furnitureItems.id,
                set: mappedPayload
            })
            .returning({ id: furnitureItems.id });

        const data = results[0] || null;

        if (payload.group_id) {
          await syncGroupCoversAndCount([String(payload.group_id)]);
        }

        return c.json({ success: true, data });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
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
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
  });
};
