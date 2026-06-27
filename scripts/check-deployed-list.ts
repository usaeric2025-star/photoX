async function checkList() {
  try {
    const resp = await fetch('https://photo-x-one.vercel.app/api/photos/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log('Status:', resp.status);
    console.log('Body:', await resp.text());
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}
checkList();
