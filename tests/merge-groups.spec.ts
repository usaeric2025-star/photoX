import { test, expect } from '@playwright/test';

test.describe('Group Merge Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup Auth via localStorage bypass - use init script for reliability
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`PAGE ERROR: ${msg.text()}`);
    });
    
    await page.addInitScript(() => {
      window.localStorage.setItem('ais_mock_auth_passcode', 'a123456');
    });
    
    // Now go to /admin
    await page.goto('/admin', { waitUntil: 'networkidle' });
    
    // Specifically wait for the skeleton to disappear and root to have content
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.innerHTML.length > 10;
    }, { timeout: 30000 });
    
    // Debug: capture what is on page if visible fails
    try {
      await expect(page.locator('header')).toBeVisible({ timeout: 15000 });
    } catch (e) {
      const html = await page.content();
      console.log('--- PAGE CONTENT ON FAILURE ---');
      console.log(html);
      console.log('--- END PAGE CONTENT ---');
      await page.screenshot({ path: 'failure-admin-load.png' });
      throw e;
    }
  });

  test('should merge multiple units into a new group', async ({ page }) => {
    // 1. Enter Selection Mode
    const selectToggle = page.locator('button[title*="選擇" i], button[title*="Selection" i]').first();
    await selectToggle.click();
    
    // 2. Click two photo cards to select them
    // We wait for data-photo-id items to appear
    const photoCards = page.locator('div[data-photo-id]');
    await expect(photoCards).toHaveCount({ min: 2 }, { timeout: 15000 });
    
    const firstId = await photoCards.nth(0).getAttribute('data-photo-id');
    const secondId = await photoCards.nth(1).getAttribute('data-photo-id');
    
    await photoCards.nth(0).click();
    await photoCards.nth(1).click();
    
    // 3. Verify selection count in toolbar
    const toolbar = page.locator('footer, .fixed.bottom-0').filter({ hasText: /選取/ });
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByText('2')).toBeVisible();
    
    // 4. Click "手動合組"
    // Use title or text
    const mergeBtn = toolbar.getByRole('button', { name: /(手動合組|合組)/i });
    await mergeBtn.click();
    
    // 5. Verify Success Toast
    await expect(page.getByText(/已合組/i)).toBeVisible({ timeout: 10000 });
    
    // 6. Verify selection is cleared and mode exited
    await expect(toolbar).not.toBeVisible();
    
    // 7. (Optional) Check if they are now in a group by navigating to one of them?
    // For now, seeing the toast and cleared selection is a good P0 E2E check.
  });
});
