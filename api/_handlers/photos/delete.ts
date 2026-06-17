import { Hono } from 'hono';
import { type } from 'arktype';
import { db, furnitureItems } from '../../../src/db/index.js';
import { eq, and } from 'drizzle-orm';
import { syncGroupCoversAndCount } from '../../_lib/groups.js';
import { PhotoIdReqSchema } from '../../_shared/apiContractSchema.js';

export const deleteHandler = (app: Hono) => {
  app.post('/delete', async (c) => {
    const body = await c.req.json();
    const check = PhotoIdReqSchema(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { id, userId } = check;
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
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
  });
};
