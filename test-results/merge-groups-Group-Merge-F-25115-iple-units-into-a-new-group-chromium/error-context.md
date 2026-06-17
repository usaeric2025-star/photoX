# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: merge-groups.spec.ts >> Group Merge Flow >> should merge multiple units into a new group
- Location: tests/merge-groups.spec.ts:36:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('header')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('header')

```

```yaml
- region "Notifications alt+T"
- img
- heading "路由錯誤 / Route Error" [level=1]
- paragraph: Unauthorized access to admin area
- button "重試 / Retry"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Group Merge Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // 1. Setup Auth via localStorage bypass - use init script for reliability
  6  |     page.on('console', msg => {
  7  |       if (msg.type() === 'error') console.log(`PAGE ERROR: ${msg.text()}`);
  8  |     });
  9  |     
  10 |     await page.addInitScript(() => {
  11 |       window.localStorage.setItem('ais_mock_auth_passcode', 'a123456');
  12 |     });
  13 |     
  14 |     // Now go to /admin
  15 |     await page.goto('/admin', { waitUntil: 'networkidle' });
  16 |     
  17 |     // Specifically wait for the skeleton to disappear and root to have content
  18 |     await page.waitForFunction(() => {
  19 |       const root = document.getElementById('root');
  20 |       return root && root.innerHTML.length > 10;
  21 |     }, { timeout: 30000 });
  22 |     
  23 |     // Debug: capture what is on page if visible fails
  24 |     try {
> 25 |       await expect(page.locator('header')).toBeVisible({ timeout: 15000 });
     |                                            ^ Error: expect(locator).toBeVisible() failed
  26 |     } catch (e) {
  27 |       const html = await page.content();
  28 |       console.log('--- PAGE CONTENT ON FAILURE ---');
  29 |       console.log(html);
  30 |       console.log('--- END PAGE CONTENT ---');
  31 |       await page.screenshot({ path: 'failure-admin-load.png' });
  32 |       throw e;
  33 |     }
  34 |   });
  35 | 
  36 |   test('should merge multiple units into a new group', async ({ page }) => {
  37 |     // 1. Enter Selection Mode
  38 |     const selectToggle = page.locator('button[title*="選擇" i], button[title*="Selection" i]').first();
  39 |     await selectToggle.click();
  40 |     
  41 |     // 2. Click two photo cards to select them
  42 |     // We wait for data-photo-id items to appear
  43 |     const photoCards = page.locator('div[data-photo-id]');
  44 |     await expect(photoCards).toHaveCount({ min: 2 }, { timeout: 15000 });
  45 |     
  46 |     const firstId = await photoCards.nth(0).getAttribute('data-photo-id');
  47 |     const secondId = await photoCards.nth(1).getAttribute('data-photo-id');
  48 |     
  49 |     await photoCards.nth(0).click();
  50 |     await photoCards.nth(1).click();
  51 |     
  52 |     // 3. Verify selection count in toolbar
  53 |     const toolbar = page.locator('footer, .fixed.bottom-0').filter({ hasText: /選取/ });
  54 |     await expect(toolbar).toBeVisible();
  55 |     await expect(toolbar.getByText('2')).toBeVisible();
  56 |     
  57 |     // 4. Click "手動合組"
  58 |     // Use title or text
  59 |     const mergeBtn = toolbar.getByRole('button', { name: /(手動合組|合組)/i });
  60 |     await mergeBtn.click();
  61 |     
  62 |     // 5. Verify Success Toast
  63 |     await expect(page.getByText(/已合組/i)).toBeVisible({ timeout: 10000 });
  64 |     
  65 |     // 6. Verify selection is cleared and mode exited
  66 |     await expect(toolbar).not.toBeVisible();
  67 |     
  68 |     // 7. (Optional) Check if they are now in a group by navigating to one of them?
  69 |     // For now, seeing the toast and cleared selection is a good P0 E2E check.
  70 |   });
  71 | });
  72 | 
```