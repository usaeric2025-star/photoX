import { Hono } from 'hono';
import { adminPhotos } from './_handlers/admin/photos.js';
import { adminSettings } from './_handlers/admin/settings.js';
import { adminDiagnose } from './_handlers/admin/diagnose.js';
import { adminRepair } from './_handlers/admin/repair.js';
import { adminMaintenance } from './_handlers/admin/maintenance.js';
import { adminBackfill } from './_handlers/admin/backfill.js';

const app = new Hono();

app.route('/settings', adminSettings);
app.route('/maintenance', adminMaintenance);
app.route('/diagnose', adminDiagnose);
app.route('/repair', adminRepair);
app.route('/backfill-photo-metadata', adminBackfill);
app.route('/', adminPhotos);

export default app;
