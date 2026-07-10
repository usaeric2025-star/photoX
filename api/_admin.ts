import { Hono } from 'hono';
import { adminPhotos } from './_handlers/admin/photos.js';
import { adminSettings } from './_handlers/admin/settings.js';
import { adminMaintenance } from './_handlers/admin/maintenance.js';
import { adminBackfill } from './_handlers/admin/backfill.js';

export const adminApp = new Hono()
  .route('/settings', adminSettings)
  .route('/maintenance', adminMaintenance)
  .route('/backfill', adminBackfill)
  .route('/photos', adminPhotos);
