const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.evaluate(async () => {
     try {
        const res = await fetch('/api/photos/list', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ isAdminMode: true, limit: 10 })
        });
        const data = await res.json();
        console.log('FETCH RESULTS:', data.success, data.data?.items?.length);
     } catch (e) {
        console.log('FETCH ERROR:', e);
     }
  });
  
  await new Promise(r => setTimeout(r, 1000));
  await browser.close();
})();
