import { Hono } from 'hono';
import * as v from 'valibot';
import { db, furnitureItems, photoTags } from '../../_lib/db/index.js';
import { inArray, eq, isNull, and } from 'drizzle-orm';
import { PhotoIdsReqSchema, PhotoCheckHashReqSchema } from '../../../shared/apiContractSchema.js';

export const detailHandler = (app: Hono) => {
  app.post('/by-ids', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoIdsReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { ids } = check.output;
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
    } catch (error: unknown) {
        const { errorFactory } = await import('../../_lib/error/AppError.js');
        throw errorFactory.wrap(error, 'api./api/photos/by-ids', 'DB_ERROR');
    }
  });

  app.post('/check-hash', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoCheckHashReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { hash } = check.output;
    try {
        const data = await db.query.furnitureItems.findFirst({
            columns: {
                imageUrl: true,
                manualCode: true
            },
            where: eq(furnitureItems.imageHash, hash)
        });
        return c.json({ success: true, data: data || null });
    } catch (error: unknown) {
        const { errorFactory } = await import('../../_lib/error/AppError.js');
        throw errorFactory.wrap(error, 'api./api/photos/check-hash', 'DB_ERROR');
    }
  });
};
