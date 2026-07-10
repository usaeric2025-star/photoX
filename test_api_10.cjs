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
    const mainScreen = document.getElementById('main-admin-screen');
    const scrollContainer = document.getElementById('photo-wall-scroll-container');
    const pageContainer = document.querySelector('.page-container');
    
    return `Main: ${mainScreen?.clientHeight}, Scroll: ${scrollContainer?.clientHeight}, Page: ${pageContainer?.clientHeight}`;
  });
  console.log('METRICS:', metrics);
  
  await browser.close();
})();
