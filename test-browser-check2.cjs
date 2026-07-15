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
    }
  });
  
  await page.goto('http://localhost:3000/group/50dabb09-def9-4330-95c9-2cdc6330e29a', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 6000));
  console.log('GROUP PAGE DONE');
  
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 6000));
  console.log('ADMIN PAGE DONE');
  
  await browser.close();
})();
