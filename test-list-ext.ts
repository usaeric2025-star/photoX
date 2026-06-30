import { hc } from 'hono/client';

async function test() {
  const res = await fetch('http://localhost:3000/api/photos/list-by-group-paginated', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId: '086d6663-1fa2-4fce-91cc-d5d410f3bc76', page: 1, pageSize: 10 })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

test().catch(console.error);
