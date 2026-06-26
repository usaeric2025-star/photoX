import { Hono } from 'hono';
import * as v from 'valibot';
import { db, furnitureItems } from '../../_lib/db/index.js';
import { eq, and } from 'drizzle-orm';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { PhotoIdReqSchema } from '../../../shared/apiContractSchema.js';

export const deleteHandler = (app: Hono) => {
  app.post('/delete', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoIdReqSchema, body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { id, userId } = check.output;
    try {
        const photoData = await db.query.furnitureItems.findFirst({
            columns: { groupId: true, imageUrl: true },
            where: eq(furnitureItems.id, id)
        });
        
        await db.delete(furnitureItems).where(
            eq(furnitureItems.id, id)
        );

        // POST-DELETE: Reconcile and count
        if (photoData?.groupId) {
          await syncGroupCoversAndCount([photoData.groupId]);
        }

        return c.json({ success: true, data: { photoData } });
    } catch (error: unknown) {
        const { errorFactory } = await import('../../_lib/error/AppError.js');
        throw errorFactory.wrap(error, 'api./api/photos/delete', 'DB_ERROR');
    }
  });
};
