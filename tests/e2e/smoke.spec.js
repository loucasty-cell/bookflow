import { test, expect } from '@playwright/test';

test('landing loads with no fatal console errors', async ({ page }) => {
  const fatal = [];
  page.on('pageerror', (error) => fatal.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      const url = message.location()?.url || '';
      if (!text.includes('favicon.ico') && !url.includes('favicon.ico') && !text.includes('Failed to load resource')) {
        fatal.push(text);
      }
    }
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/Bookflow/);
  await expect(page.locator('#root')).not.toBeEmpty();

  const tdz = fatal.filter((entry) => entry.includes('before initialization') || entry.includes('totalWords'));
  expect(tdz).toEqual([]);
  expect(fatal).toEqual([]);
});

test('narrow viewport has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).not.toBeEmpty();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
