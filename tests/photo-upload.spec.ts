import { test, expect } from '@playwright/test';

test.describe('Photo Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`PAGE ERROR: ${msg.text()}`);
    });
    
    await page.addInitScript(() => {
      window.localStorage.setItem('ais_mock_auth_passcode', 'a123456');
    });
    
    await page.goto('/admin', { waitUntil: 'networkidle' });
    
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.innerHTML.length > 10;
    }, { timeout: 30000 });
  });

  test('should trigger photo upload flow', async ({ page }) => {
    // Look for the quick add file input directly, or the floating action button
    // The Quick Add input has id `admin-quick-add-input`
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
    
    // Check FAB button "New" or "+"
    const addBtn = page.getByRole('button', { name: /(New|新增)/i }).first();
    if (await addBtn.isVisible()) {
        await addBtn.click();
    } else {
        // Fallback: click any generic plus button if the specific FAB is hidden or named differently
        const plusBtn = page.locator('button').filter({ has: page.locator('lucide-upload, lucide-plus') }).first();
        if (await plusBtn.isVisible()) {
           await plusBtn.click();
        }
    }
    
    // We expect the file chooser to pop up
    // Note: Actually fulfilling the file dialog requires generating a fake file.
    // As an e2e confirmation, just opening the file chooser guarantees the UI is wired up.
    const fileChooser = await fileChooserPromise;
    expect(fileChooser.isMultiple()).toBeTruthy();
    
    // Note: Full E2E for uploading would mock R2 and the API. 
    // This verifies the frontend triggers the OS dialog correctly.
  });
});
