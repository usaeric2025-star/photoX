import { config } from 'dotenv';
config({ path: '.env' });
async function test() {
  const res = await fetch('http://localhost:3000/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
