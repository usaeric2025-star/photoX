const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));
  page.on('response', response => {
    if (response.status() === 404) {
      console.log('404 URL:', response.url());
    }
  });
  
  console.log('Navigating...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  console.log('Page loaded. #root HTML length:');
  const rootLen = await page.evaluate(() => document.getElementById('root')?.innerHTML.length);
  console.log('Root HTML length:', rootLen);
  
  await browser.close();
})();
