import { adminErrorEvents } from './api/handlers/admin/error-events.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const req = new Request('http://localhost/error-events');
  const res = await adminErrorEvents.request(req);
  const json = await res.json();
  console.log(json);
}
test();
