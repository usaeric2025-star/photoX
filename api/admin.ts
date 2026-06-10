import { Hono } from 'hono';
import { adminPhotos } from './_handlers/admin/photos.js';
import { adminSettings } from './_handlers/admin/settings.js';
import { adminDiagnose } from './_handlers/admin/diagnose.js';
import { adminRepair } from './_handlers/admin/repair.js';
import { adminMaintenance } from './_handlers/admin/maintenance.js';
import { storageMaintenance } from './_handlers/admin/storageMaintenance.js';
import { adminBackfill } from './_handlers/admin/backfill.js';
import { adminErrorEvents } from './_handlers/admin/error-events.js';

import { handle } from "hono/vercel";

const app = new Hono();

app.route('/', adminPhotos);
app.route('/settings', adminSettings);
app.route('/diagnose', adminDiagnose);
app.route('/repair', adminRepair);
app.route('/maintenance', adminMaintenance);
app.route('/storage', storageMaintenance);
app.route('/backfill', adminBackfill);
app.route('/events', adminErrorEvents);

// ✅ Named fetch export for Vercel
export const fetch = handle(app);

export default app;
