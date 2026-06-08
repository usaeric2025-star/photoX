import { adminDiagnose } from './api/handlers/admin/diagnose.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const req = new Request('http://localhost/diagnose-r2');
  const res = await adminDiagnose.request(req);
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
test();
