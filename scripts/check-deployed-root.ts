async function checkRoot() {
  try {
    const resp = await fetch('https://photo-x-one.vercel.app/');
    console.log('Status:', resp.status);
    // console.log('Body:', await resp.text());
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}
checkRoot();
