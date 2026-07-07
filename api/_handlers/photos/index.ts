import { Hono } from 'hono';
import { listRoutes } from './list.js';
import { listExtendedHandlers } from './listExtended.js';
import { detailHandler } from './detail.js';
import { createHandler } from './create.js';
import { updateHandler } from './update.js';
import { deleteHandler } from './delete.js';
import { checkHashHandler } from './checkHash.js';

export const photos = new Hono()
  .route('/', listRoutes);

listExtendedHandlers(photos);
detailHandler(photos);
createHandler(photos);
updateHandler(photos);
deleteHandler(photos);
checkHashHandler(photos);
