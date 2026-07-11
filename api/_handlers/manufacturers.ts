import { Hono } from 'hono';
import { sValidator } from '@hono/standard-validator';
import { db, manufacturers as manufacturersTable } from '../_lib/db/index.js';
import { eq, asc } from 'drizzle-orm';
import * as v from 'valibot';
import { ManufacturerReqSchema } from '../../shared/apiContractSchema.js';
import { errorResponse, successResponse } from '../_lib/response.js';

export const manufacturers = new Hono()
  .get('/', async (c) => {
    const data = await db
      .select()
      .from(manufacturersTable)
      .orderBy(asc(manufacturersTable.name));
    
    return successResponse(c, data);
  })
  .post('/clear-photos', sValidator('json', v.object({ manufacturerId: v.string() })), async (c) => {
    const { manufacturerId } = c.req.valid('json');
    const { furnitureItems } = await import('../_lib/db/index.js');
    const updated = await db
        .update(furnitureItems)
        .set({ manufacturerId: null })
        .where(eq(furnitureItems.manufacturerId, manufacturerId))
        .returning({ id: furnitureItems.id });
    
    return successResponse(c, updated.map(i => i.id));
  })
  .post('/', sValidator('json', v.object({ manufacturerData: ManufacturerReqSchema })), async (c) => {
    const { manufacturerData } = c.req.valid('json');
    const crypto = await import('node:crypto');
    const [data] = await db
      .insert(manufacturersTable)
      .values({
          id: crypto.randomUUID(),
          ...manufacturerData
      })
      .returning();
    
    return successResponse(c, data);
  })
  .put('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', sValidator('json', v.object({ updates: v.omit(ManufacturerReqSchema, ["id"]) })), async (c) => {
    const id = c.req.param('id');
    const { updates } = c.req.valid('json');

    await db
      .update(manufacturersTable)
      .set(updates)
      .where(eq(manufacturersTable.id, id));
    
    return successResponse(c, null);
  })
  .delete('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', async (c) => {
    const id = c.req.param('id');
    await db
      .delete(manufacturersTable)
      .where(eq(manufacturersTable.id, id));
    
    return successResponse(c, null);
  });
