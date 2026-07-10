import { Hono } from 'hono';
import * as v from 'valibot';
import { db, furnitureItems, aiAuditLogs } from '../../_lib/db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { refreshPhotosView } from '../../_lib/db/actions.js';
import { errorResponse, successResponse } from '../../_lib/response.js';
import { PhotoIdsReqSchema } from '../../../shared/apiContractSchema.js';
import { errorFactory } from '../../_lib/error/factory.js';

export const deleteRoutes = new Hono()
  .post('/delete', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoIdsReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { ids } = check.output;
    try {
        const photosData = await db.select({ groupId: furnitureItems.groupId })
            .from(furnitureItems)
            .where(inArray(furnitureItems.id, ids));
        
        const groupIds = Array.from(new Set<string>(photosData.map(p => p.groupId).filter((id): id is string => typeof id === 'string')));
        
        // Pre-delete cleanup to avoid FK constraints
        await db.delete(aiAuditLogs).where(inArray(aiAuditLogs.photoId, ids));

        await db.delete(furnitureItems).where(
            inArray(furnitureItems.id, ids)
        );

        // POST-DELETE: Reconcile and count
        if (groupIds.length > 0) {
          await syncGroupCoversAndCount(groupIds);
        }

        await refreshPhotosView();

        return successResponse(c, { ids });
    } catch (error: unknown) {
        throw errorFactory.wrap(error, 'api.photos.delete', 'DB_ERROR');
    }
  });
