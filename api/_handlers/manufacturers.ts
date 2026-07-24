import { Hono } from 'hono';
import * as v from 'valibot';
import { ManufacturerReqSchema } from '../../shared/apiContractSchema.js';
import { successResponse } from '../_lib/response.js';
import { errorFactory } from '../_lib/error/factory.js';
import { 
    getAllManufacturers, 
    clearPhotosFromManufacturer, 
    createManufacturer, 
    updateManufacturer, 
    deleteManufacturer 
} from '../_lib/db/queries/manufacturers.js';

export const manufacturers = new Hono()
  .get('/', async (c) => {
    const data = await getAllManufacturers();
    return successResponse(c, data);
  })
  .post('/clear-photos', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ manufacturerId: v.string() }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { manufacturerId } = check.output;
    const updated = await clearPhotosFromManufacturer(manufacturerId);
    
    return successResponse(c, updated.map(i => i.id));
  })
  .post('/', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(v.object({ manufacturerData: ManufacturerReqSchema }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { manufacturerData } = check.output;
    const crypto = await import('node:crypto');
    const data = await createManufacturer({
        id: crypto.randomUUID(),
        ...manufacturerData
    });
    
    return successResponse(c, data);
  })
  .put('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const check = v.safeParse(v.object({ updates: v.omit(ManufacturerReqSchema, ["id"]) }), body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { updates } = check.output;

    await updateManufacturer(id, updates);
    return successResponse(c, null);
  })
  .delete('/:id{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}}', async (c) => {
    const id = c.req.param('id');
    await deleteManufacturer(id);
    return successResponse(c, null);
  });
