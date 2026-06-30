import { Hono } from 'hono';
import { db, manufacturers as manufacturersTable } from '@/api/_lib/db/index.js';
import { eq, asc } from 'drizzle-orm';
import * as v from 'valibot';
import { ManufacturerReqSchema } from '@/shared/apiContractSchema.js';
import { errorResponse } from '@/api/_lib/response.js';

export const manufacturers = new Hono()
  .get('/', async (c) => {
    const data = await db
      .select()
      .from(manufacturersTable)
      .orderBy(asc(manufacturersTable.name));
    
    return c.json({ success: true, data });
  })
  .post('/clear-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ manufacturerId: v.string() }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { manufacturerId } = check.output;
    const { furnitureItems } = await import('../_lib/db/index.js');
    const updated = await db
        .update(furnitureItems)
        .set({ manufacturerId: null })
        .where(eq(furnitureItems.manufacturerId, manufacturerId))
        .returning({ id: furnitureItems.id });
    
    return c.json({ success: true, data: updated.map(i => i.id) });
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ manufacturerData: ManufacturerReqSchema }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { manufacturerData } = check.output;
    const crypto = await import('node:crypto');
    const [data] = await db
      .insert(manufacturersTable)
      .values({
          id: crypto.randomUUID(),
          name: manufacturerData.name,
          aliases: manufacturerData.aliases || []
      })
      .returning();
    
    return c.json({ success: true, data });
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = v.safeParse(v.object({ updates: v.omit(ManufacturerReqSchema, ["id"]) }), body);
    if (!check.success) return errorResponse(c, check.issues[0].message, 400);

    const { updates } = check.output;
    await db
      .update(manufacturersTable)
      .set({ name: updates.name })
      .where(eq(manufacturersTable.id, id));
    
    return c.json({ success: true });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    await db
      .delete(manufacturersTable)
      .where(eq(manufacturersTable.id, id));
    
    return c.json({ success: true });
  });
