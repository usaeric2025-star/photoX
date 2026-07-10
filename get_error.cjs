const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  
  const text = await page.evaluate(() => {
    const el = document.getElementById('startup-error-logs');
    return el ? el.textContent : 'NO ERROR OVERLAY';
  });
  console.log('ERROR TEXT:', text);
  
  await browser.close();
})();
