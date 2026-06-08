import { Hono } from 'hono';
import { adminPhotos } from './photos.js';
import { adminSettings } from './settings.js';
import { adminErrorEvents } from './error-events.js';
import { adminDiagnose } from './diagnose.js';
import { adminRepair } from './repair.js';
import { adminMaintenance } from './maintenance.js';
import { adminBackfill } from './backfill.js';
import { storageMaintenance } from './storageMaintenance.js';

export const admin = new Hono()
  .route("/", adminPhotos)
  .route("/settings", adminSettings)
  .route("/", adminErrorEvents)
  .route("/", adminDiagnose)
  .route("/", adminRepair)
  .route("/maintenance", adminMaintenance)
  .route("/", adminBackfill)
  .route("/", storageMaintenance);
