import { Hono } from 'hono';
import { db, manufacturers as manufacturersTable } from '../_lib/db/index.js';
import { eq, asc } from 'drizzle-orm';
import { type } from 'arktype';
import { ManufacturerReqSchema } from '../_shared/apiContractSchema.js';

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
    const check = type({ manufacturerId: "string" })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { manufacturerId } = check;
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
    const check = type({ manufacturerData: ManufacturerReqSchema })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { manufacturerData } = check;
    try {
      const [data] = await db
        .insert(manufacturersTable)
        .values({
           name: manufacturerData.name
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
    const check = type({ updates: ManufacturerReqSchema.omit("id") })(body);
    if (check instanceof type.errors) throw new Error(check.summary);

    const { updates } = check;
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
