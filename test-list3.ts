import { config } from 'dotenv';
config({ path: '.env' });
async function test() {
  const res = await fetch('http://localhost:3000/api/photos/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: 0, limit: 100, isAdminMode: true })
  });
  const data = await res.json();
  const hits = data.data.filter((d: any) => d.photo_tags && d.photo_tags.length > 0);
  console.log(hits.length);
}
test();
