import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
     const fetchResponse = await fetch('http://localhost:3000/api/admin/diagnose/r2');
     console.log('Status code:', fetchResponse.status);
     const resData = await fetchResponse.json();
     console.log('Result:', JSON.stringify(resData, null, 2));
  } catch (err) {
     console.error('Fetch error calling endpoint:', err);
  }
}
test();
