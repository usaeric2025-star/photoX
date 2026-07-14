import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => {
      console.log('PAGE LOG:', msg.type(), msg.text());
  });
  await page.goto('http://localhost:3000/admin');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
