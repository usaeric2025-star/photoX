const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  
  await page.evaluate(() => {
    localStorage.setItem('ais_mock_auth_passcode', '"a123456"');
  });
  
  // Reload the page so localStorage is active on mount
  await page.reload({ waitUntil: 'domcontentloaded' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const passcode = await page.evaluate(() => localStorage.getItem('ais_mock_auth_passcode'));
  console.log('PASSCODE IS:', passcode);
  
  const h = await page.evaluate(() => document.body.innerHTML);
  if (h.includes('AdminEmptyState')) {
      console.log('UI SHOWS EMPTY STATE');
  } else if (h.includes('type="password"')) {
      console.log('UI SHOWS LOGIN SCREEN');
  } else {
      console.log('UI SHOWS PHOTO WALL');
  }
  
  await browser.close();
})();
