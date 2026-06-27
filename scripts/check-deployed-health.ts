async function checkHealth() {
  try {
    const resp = await fetch('https://photo-x-one.vercel.app/api/health');
    console.log('Status:', resp.status);
    console.log('Body:', await resp.text());
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}
checkHealth();
