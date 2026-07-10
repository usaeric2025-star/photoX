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
  
  const hasItems = await page.evaluate(() => document.querySelectorAll('[data-photo-id]').length);
  const masonry = await page.evaluate(() => document.querySelector('.page-container')?.innerHTML.substring(0, 200));
  console.log('ITEMS COUNT:', hasItems);
  console.log('MASONRY HTML:', masonry);
  
  await browser.close();
})();
