const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));
  
  const title = await page.title();
  const ready = await page.evaluate(() => window.__APP_READY__);
  const errors = await page.evaluate(() => window.errors || []);
  console.log('TITLE:', title);
  console.log('READY:', ready);
  console.log('ERRORS:', errors);
  await browser.close();
})();
