import { hc } from 'hono/client';

async function test() {
  const res = await fetch('http://localhost:3000/api/photos/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 10 })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

test().catch(console.error);
