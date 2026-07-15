import { test, expect } from '@playwright/test';

test.describe('Photo Grid and Lightbox', () => {
  test('should open lightbox when a photo is clicked', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the grid to load
    const firstPhoto = page.locator('[data-photo-id]').first();
    await expect(firstPhoto).toBeVisible();
    
    // Click the photo
    await firstPhoto.click();
    
    // Check if lightbox is visible (using the fixed container class identified in previous tests)
    const lightbox = page.locator('div.fixed.inset-0.z-\\[100\\]');
    await expect(lightbox).toBeVisible();
  });
});
