import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
      if (msg.type() === 'error') {
          console.log('PAGE ERROR:', msg.text());
      }
  });
  page.on('pageerror', err => {
      console.log('PAGE EXCEPTION:', err.message);
  });

  try {
      console.log("Navigating to /admin...");
      await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1000));
      
      console.log("Navigating to /admin/diagnostics...");
      await page.goto('http://localhost:3000/admin/diagnostics', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1000));
      
      console.log("Smoke test complete.");
  } catch (err) {
      console.log("TEST FAILED", err);
  } finally {
      await browser.close();
  }
})();
