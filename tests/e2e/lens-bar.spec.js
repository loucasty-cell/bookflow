import { test, expect } from '@playwright/test';

const LAUNCHER = 'Open assistant';
const BAR = 'Reading assistant';

async function openSampleBook(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /read the sample/i }).first().click();
  await expect(page.locator('.reader-canvas')).toBeVisible();
}

async function openBar(page) {
  await page.getByRole('button', { name: LAUNCHER }).first().click();
  const bar = page.getByRole('region', { name: BAR });
  await expect(bar).toBeVisible();
  return bar;
}

/** Triple click selects a real paragraph, which is what the reader records. */
async function selectPassage(page) {
  const paragraph = page.locator('[data-paragraph-id]').first();
  await expect(paragraph).toBeVisible();
  await paragraph.click({ clickCount: 3 });
  await expect
    .poll(async () => page.evaluate(() => String(window.getSelection() ?? '').trim().length))
    .toBeGreaterThan(0);
}

test('the lens bar opens from the reader and stays inside the viewport', async ({ page }) => {
  await openSampleBook(page);
  const bar = await openBar(page);

  const box = await bar.boundingBox();
  expect(box).not.toBeNull();
  const viewport = page.viewportSize();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
});

test('the bar shows a draggable grip, a capped input and a send button', async ({ page }) => {
  await openSampleBook(page);
  const bar = await openBar(page);

  await expect(bar.locator('.lens-grip')).toHaveAttribute('role', 'button');
  const input = bar.locator('.lens-input');
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute('maxlength', '500');
  await expect(bar.getByRole('button', { name: 'Send', exact: true })).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Context and mode' })).toBeVisible();
});

test('the consent line appears before any send and offers all three choices', async ({ page }) => {
  await openSampleBook(page);
  const bar = await openBar(page);

  const consent = bar.locator('.lens-consent');
  await expect(consent).toBeVisible();
  for (const label of ['Send once', 'Always', 'Keep local']) {
    await expect(bar.getByRole('button', { name: label })).toBeVisible();
  }
});

test('choosing Keep local answers without any network request', async ({ page }) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));

  await openSampleBook(page);
  await selectPassage(page);
  const bar = await openBar(page);

  await bar.getByRole('button', { name: 'Context and mode' }).click();
  await bar.getByRole('menuitem', { name: 'Use current paragraph' }).click();
  await expect(bar.locator('.lens-quote')).toBeVisible();

  await bar.getByRole('button', { name: 'Keep local' }).click();
  await expect(bar.locator('.lens-consent')).toHaveCount(0);

  await bar.locator('.lens-input').fill('What is this about?');
  await bar.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(bar.locator('.lens-answer')).toContainText('Offline answer (limited)');
  const lensCalls = requests.filter((url) => url.includes('/api/reading-lens'));
  expect(lensCalls).toEqual([]);
});

test('sending with no passage says so instead of doing nothing', async ({ page }) => {
  await openSampleBook(page);
  const bar = await openBar(page);

  await bar.getByRole('button', { name: 'Keep local' }).click();
  await bar.locator('.lens-input').fill('anything');
  await bar.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(bar.locator('.lens-answer')).toContainText('Select a passage first.');
});

test('the menu switches mode and shows the language field only for translate', async ({ page }) => {
  await openSampleBook(page);
  const bar = await openBar(page);

  await bar.getByRole('button', { name: 'Context and mode' }).click();
  const menu = bar.getByRole('menu', { name: 'Assistant options' });
  await expect(menu).toBeVisible();

  await expect(menu.getByLabel('Target language')).toHaveCount(0);
  await menu.getByRole('menuitemradio', { name: 'Translate' }).click();

  await bar.getByRole('button', { name: 'Context and mode' }).click();
  await expect(bar.getByRole('menu').getByLabel('Target language')).toBeVisible();
  await expect(bar.locator('.lens-input')).toHaveAttribute('placeholder', /translate this/i);
});

test('Escape collapses the bar and the round button expands it', async ({ page }) => {
  await openSampleBook(page);
  const bar = await openBar(page);

  await bar.locator('.lens-input').focus();
  await page.keyboard.press('Escape');
  await expect(bar).toHaveAttribute('data-collapsed', 'true');

  await bar.getByRole('button', { name: LAUNCHER }).first().click();
  await expect(bar).not.toHaveAttribute('data-collapsed', 'true');
});

test('the grip is keyboard movable and the position persists', async ({ page }) => {
  await openSampleBook(page);
  const bar = await openBar(page);

  const grip = bar.locator('.lens-grip');
  await grip.focus();
  const before = await bar.boundingBox();

  await page.keyboard.press('Shift+ArrowUp');
  await page.waitForTimeout(150);
  const after = await bar.boundingBox();
  expect(after.y).toBeLessThan(before.y);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openSampleBook(page);
  const restored = await openBar(page);
  const restoredBox = await restored.boundingBox();
  expect(Math.abs(restoredBox.y - after.y)).toBeLessThan(40);
});

for (const width of [320, 390, 430]) {
  test(`the bar causes no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openSampleBook(page);
    await openBar(page);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflow).toBe(false);
  });
}

test('the bar honours reduced motion without breaking', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSampleBook(page);
  const bar = await openBar(page);
  await expect(bar.locator('.lens-input')).toBeVisible();
});

test('the bar resolves its own dark theme from the app theme attribute', async ({ page }) => {
  await openSampleBook(page);
  const bar = await openBar(page);
  await expect(bar).toHaveAttribute('data-lens-theme', 'light');

  await page.evaluate(() => {
    document.querySelector('.app-shell')?.setAttribute('data-theme', 'dusk');
  });
  await expect(bar).toHaveAttribute('data-lens-theme', 'dark');
});

test('the bar never injects markup from a hostile answer', async ({ page }) => {
  await openSampleBook(page);
  await selectPassage(page);
  const bar = await openBar(page);

  // The local path only, so no network is required.
  await bar.getByRole('button', { name: 'Context and mode' }).click();
  await bar.getByRole('menuitem', { name: 'Use current paragraph' }).click();
  await bar.getByRole('button', { name: 'Keep local' }).click();
  await bar.locator('.lens-input').fill('tell me');
  await bar.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(bar.locator('.lens-answer')).toContainText('Offline answer (limited)');

  // Undefined, not false: nothing ever set it, so no handler executed.
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  await expect(bar.locator('.lens-answer')).not.toContainText('<img');
});
