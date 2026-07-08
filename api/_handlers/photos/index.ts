import { Hono } from 'hono';
import { listRoutes } from './list.js';
import { listExtendedRoutes } from './listExtended.js';
import { detailRoutes } from './detail.js';
import { createRoutes } from './create.js';
import { updateRoutes } from './update.js';
import { deleteRoutes } from './delete.js';
import { checkHashRoutes } from './checkHash.js';

export const photos = new Hono()
  .route('/', listRoutes)
  .route('/', listExtendedRoutes)
  .route('/', detailRoutes)
  .route('/', createRoutes)
  .route('/', updateRoutes)
  .route('/', deleteRoutes)
  .route('/', checkHashRoutes);
