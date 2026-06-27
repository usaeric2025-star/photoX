async function checkTest() {
  try {
    const resp = await fetch('https://photo-x-one.vercel.app/api/test-ping');
    console.log('Status:', resp.status);
    console.log('Body:', await resp.text());
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}
checkTest();
