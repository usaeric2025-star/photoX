const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('error', err => console.log('ERROR:', err.message));
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 5000));
  
  const errors = await page.evaluate(() => { 
     return window.__STARTUP_ERRORS__ || [];
  });
  console.log('WINDOW ERRORS:', errors);
  await browser.close();
})();
