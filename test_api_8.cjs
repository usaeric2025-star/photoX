const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('ais_mock_auth_passcode', '"a123456"');
  });
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));
  
  const metrics = await page.evaluate(() => {
    const el = document.querySelector('.page-container');
    if (!el) return 'NO CONTAINER';
    const rect = el.getBoundingClientRect();
    
    const parentRect = document.getElementById('photo-wall-scroll-container')?.getBoundingClientRect();
    
    return `Container: ${rect.width}x${rect.height}, Parent: ${parentRect?.width}x${parentRect?.height}`;
  });
  console.log('METRICS:', metrics);
  
  await browser.close();
})();
