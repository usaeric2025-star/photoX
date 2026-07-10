const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('response', response => {
    console.log('RESPONSE:', response.status(), response.url());
  });
  
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('ais_mock_auth_passcode', '"a123456"');
  });
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
