const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  
  // Set auth cookie
  await page.setCookie({
    name: 'auth_token',
    value: 'test',
    domain: 'localhost',
    path: '/'
  });
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));
  
  const h = await page.evaluate(() => document.body.innerHTML);
  if (h.includes('AdminEmptyState') || h.includes('暂无照片') || h.includes('开始上传')) {
      console.log('UI SHOWS EMPTY STATE');
  } else {
      console.log('UI DOES NOT SHOW EMPTY STATE');
  }
  
  await browser.close();
})();
