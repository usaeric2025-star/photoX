import { Hono } from 'hono';
import * as v from 'valibot';
import { db, furnitureItems } from '../../_lib/db/index.js';
import { inArray, eq } from 'drizzle-orm';
import { PhotoIdsReqSchema, PhotoCheckHashReqSchema } from '../../../shared/apiContractSchema.js';
import { errorResponse, successResponse } from '../../_lib/response.js';

export const detailRoutes = new Hono()
  .post('/by-ids', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoIdsReqSchema, body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { ids } = check.output;
    const results = await db.query.furnitureItems.findMany({
        where: inArray(furnitureItems.id, ids),
        with: {
            tags: {
                with: {
                    tag: true
                }
            },
            category: true,
            group: true
        }
    });

    const formatted = results.map(photo => {
        const { tags, category, group, ...rest } = photo;
        return {
            ...rest,
            category,
            group,
            photoTags: tags.map(t => ({ 
                tagId: t.tagId,
                tags: t.tag // Match the naming expected by mapSupabasePhoto
            }))
        };
    });

    return successResponse(c, formatted);
  });
