import { Hono } from 'hono';
import { adminPhotos } from './handlers/admin/photos.js';
import { adminSettings } from './handlers/admin/settings.js';
import { adminDiagnose } from './handlers/admin/diagnose.js';
import { adminRepair } from './handlers/admin/repair.js';
import { adminMaintenance } from './handlers/admin/maintenance.js';
import { storageMaintenance } from './handlers/admin/storageMaintenance.js';

const app = new Hono();

app.route('/photos', adminPhotos);
app.route('/settings', adminSettings);
app.route('/diagnose', adminDiagnose);
app.route('/repair', adminRepair);
app.route('/maintenance', adminMaintenance);
app.route('/storage', storageMaintenance);

export default app;
