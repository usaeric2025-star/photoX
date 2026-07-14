const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('error', err => console.log('ERROR:', err.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url()));
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  
  // Also get any window errors
  const errors = await page.evaluate(() => {
     return window.errors || [];
  });
  console.log('WINDOW ERRORS:', errors);

  await browser.close();
})();
