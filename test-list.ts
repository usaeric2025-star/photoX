import { config } from 'dotenv';
config({ path: '.env' });
async function test() {
  const res = await fetch('http://localhost:3000/api/photos/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 0, limit: 1, isAdminMode: true })
  });
  console.log(JSON.stringify(await res.json(), null, 2));
}
test();
