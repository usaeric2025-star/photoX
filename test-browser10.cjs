const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000/group/50dabb09-def9-4330-95c9-2cdc6330e29a', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 6000));
  
  // Click first photo
  console.log('Clicking photo...');
  await page.evaluate(() => {
    const card = document.querySelector('[data-photo-id]');
    if (card) {
      const clickable = card.querySelector('div, img');
      if (clickable) clickable.click();
    }
  });
  await new Promise(r => setTimeout(r, 2000));
  
  const lightboxVisible = await page.evaluate(() => {
    return !!document.querySelector('.yarl__root');
  });
  console.log('LIGHTBOX VISIBLE:', lightboxVisible);
  await browser.close();
})();
