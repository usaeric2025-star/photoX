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
  
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 6000));
  
  console.log('Clicking photo...');
  await page.evaluate(() => {
    const card = document.querySelector('[data-photo-id="standalone-photo-id"]'); // No, let's just find any card.
    // wait, we can find a card without member count badge, meaning it's a standalone photo
    const cards = Array.from(document.querySelectorAll('[data-photo-id]'));
    for (const c of cards) {
      if (!c.querySelector('svg.lucide-layers')) {
        const clickable = c.querySelector('div, img');
        if (clickable) clickable.click();
        return;
      }
    }
    // if all are groups, click the first one (it will navigate)
    if (cards.length > 0) {
       cards[0].querySelector('div, img').click();
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  
  const lightboxVisible = await page.evaluate(() => {
    const el = document.querySelector('div.fixed.inset-0.z-\\[100\\]');
    return !!el;
  });
  console.log('LIGHTBOX VISIBLE:', lightboxVisible);
  await browser.close();
})();
