import { Hono } from 'hono';
import { db, manufacturers as manufacturersTable } from '../_lib/db/index.js';
import { eq, asc } from 'drizzle-orm';
import * as v from 'valibot';
import { ManufacturerReqSchema } from '../../shared/apiContractSchema.js';

export const manufacturers = new Hono()
  .get('/', async (c) => {
    try {
      const data = await db
        .select()
        .from(manufacturersTable)
        .orderBy(asc(manufacturersTable.name));
      
      return c.json({ success: true, data });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  })
  .post('/clear-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ manufacturerId: v.string() }), body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { manufacturerId } = check.output;
    try {
      const { furnitureItems } = await import('../_lib/db/index.js');
      const updated = await db
          .update(furnitureItems)
          .set({ manufacturerId: null })
          .where(eq(furnitureItems.manufacturerId, manufacturerId))
          .returning({ id: furnitureItems.id });
      
      return c.json({ success: true, data: updated.map(i => i.id) });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ manufacturerData: ManufacturerReqSchema }), body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { manufacturerData } = check.output;
    try {
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
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  })
  .put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = v.safeParse(v.object({ updates: v.omit(ManufacturerReqSchema, ["id"]) }), body);
    if (!check.success) throw new Error(check.issues[0].message);

    const { updates } = check.output;
    try {
      await db
        .update(manufacturersTable)
        .set({ name: updates.name })
        .where(eq(manufacturersTable.id, id));
      
      return c.json({ success: true });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    try {
      await db
        .delete(manufacturersTable)
        .where(eq(manufacturersTable.id, id));
      
      return c.json({ success: true });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      return c.json({ success: false, error: err.message }, 500);
    }
  });
