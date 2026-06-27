import 'dotenv/config';
import { app } from '../api/app.js';

async function run() {
  console.log('Testing /api/public/settings...');
  try {
    const res = await app.request('/api/public/settings');
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Body:', JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.error('Error fetching /api/public/settings:', err.message, err);
  }

  console.log('\nTesting /api/photos/list...');
  try {
    const res = await app.request('/api/photos/list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: 0,
        limit: 10,
        sortOrder: 'newest'
      })
    });
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Body data length:', json.data?.length);
    console.log('Body data total:', json.total);
    console.log('Body:', JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.error('Error fetching /api/photos/list:', err.message, err);
  }
  
  console.log('\nExiting process...');
  process.exit(0);
}

run();
