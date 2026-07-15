const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('console', msg => {
    if (msg.type() === 'error') {
       Promise.all(msg.args().map(arg => arg.jsonValue())).then(args => {
           console.log('PAGE CONSOLE ERROR:', ...args);
       });
    } else {
       console.log('PAGE LOG:', msg.text());
    }
  });
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 6000));
  
  const errors = await page.evaluate(() => window.errors || []);
  console.log('WINDOW ERRORS:', errors);
  await browser.close();
})();
