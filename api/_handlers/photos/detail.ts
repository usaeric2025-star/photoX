import { Hono } from 'hono';
import { type } from 'arktype';
import { db, furnitureItems, photoTags } from '../../_lib/db/index.js';
import { inArray, eq, isNull, and } from 'drizzle-orm';
import { PhotoIdsReqSchema, PhotoCheckHashReqSchema } from '../../_shared/apiContractSchema.js';

export const detailHandler = (app: Hono) => {
  app.post('/by-ids', async (c) => {
    const body = await c.req.json();
    const check = PhotoIdsReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { ids } = check;
    try {
        const results = await db.query.furnitureItems.findMany({
            where: inArray(furnitureItems.id, ids),
            with: {
                tags: {
                    columns: {
                        tagId: true
                    }
                }
            }
        });

        // Legacy format matching photo_tags: [{tag_id: '...'}]
        const formatted = results.map(photo => {
            const { tags, ...rest } = photo;
            return {
                ...rest,
                photo_tags: tags.map(t => ({ tag_id: t.tagId }))
            };
        });

        return c.json({ success: true, data: formatted });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
  });

  app.post('/without-thumb-hash', async (c) => {
    try {
        const data = await db
            .select({ id: furnitureItems.id })
            .from(furnitureItems)
            .where(isNull(furnitureItems.thumbHash));
        return c.json({ success: true, data: data || [] });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
  });

  app.post('/check-hash', async (c) => {
    const body = await c.req.json();
    const check = PhotoCheckHashReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { hash } = check;
    try {
        const data = await db.query.furnitureItems.findFirst({
            columns: {
                imageUrl: true,
                manualCode: true
            },
            where: eq(furnitureItems.imageHash, hash)
        });
        return c.json({ success: true, data: data || null });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
  });
};
