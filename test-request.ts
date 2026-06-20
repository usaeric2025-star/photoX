async function test() {
  try {
    const res = await fetch('http://localhost:3000');
    console.log('Status for http://localhost:3000:', res.status);
    const body = await res.text();
    console.log('Body length:', body.length);
    console.log('Body start:', body.slice(0, 200));

    const res2 = await fetch('http://localhost:3000/api/public/settings');
    console.log('Status for /api/public/settings:', res2.status);
    const body2 = await res2.text();
    console.log('Public settings:', body2);
  } catch (err: any) {
    console.error('Error fetching:', err.message);
  }
}
test();
