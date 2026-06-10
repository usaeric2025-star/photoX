import { Hono } from 'hono';
import { adminPhotos } from './_handlers/admin/photos';
import { adminSettings } from './_handlers/admin/settings';
import { adminDiagnose } from './_handlers/admin/diagnose';
import { adminRepair } from './_handlers/admin/repair';
import { adminMaintenance } from './_handlers/admin/maintenance';
import { storageMaintenance } from './_handlers/admin/storageMaintenance';
import { adminBackfill } from './_handlers/admin/backfill';

const app = new Hono();

app.route('/photos', adminPhotos);
app.route('/settings', adminSettings);
app.route('/diagnose', adminDiagnose);
app.route('/repair', adminRepair);
app.route('/maintenance', adminMaintenance);
app.route('/storage', storageMaintenance);
app.route('/backfill', adminBackfill);

export default app;
