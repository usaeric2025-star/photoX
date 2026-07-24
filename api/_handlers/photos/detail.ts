import { errorFactory } from "../../_lib/error/factory.js";
import { Hono } from 'hono';
import * as v from 'valibot';
import { PhotoIdsReqSchema } from '../../../shared/apiContractSchema.js';
import { errorResponse, successResponse } from '../../_lib/response.js';
import { getPhotosByIds, getPhotoById } from '../../_lib/db/queries/photos.js';

export const detailRoutes = new Hono()
  .post('/by-ids', async (c) => {
    const body = await c.req.json();
    const check = v.safeParse(PhotoIdsReqSchema, body);
    if (!check.success) throw errorFactory.validation(check.issues);
    const { ids } = check.output;
    const data = await getPhotosByIds(ids);
    return successResponse(c, data);
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const photo = await getPhotoById(id);
    if (!photo) throw errorFactory.notFound('Photo not found');
    return successResponse(c, photo);
  });
