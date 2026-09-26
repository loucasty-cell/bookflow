import { test, expect } from '@playwright/test';

async function selectFirstParagraph(page) {
  await page.evaluate(() => {
    const paragraph = document.querySelector('[data-paragraph-id]');
    if (!paragraph) throw new Error('Reader paragraph was not mounted.');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
  });
}

for (const width of [320, 390]) {
  test(`selection Lens stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Read the sample' }).click();
    await expect(page.locator('[data-paragraph-id]').first()).toBeVisible();

    await selectFirstParagraph(page);
    const lensButton = page.getByRole('button', { name: 'Ask Reading Lens about this selection' });
    await expect(lensButton).toBeVisible();
    await lensButton.click();

    const card = page.locator('.focus-card');
    await expect(card).toBeVisible();
    await expect(page.locator('.lens-head-sub')).toContainText('chars');
    await expect(page.locator('.lens-consent-dot')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Ask Reading Lens a question about the passage' })).toBeEnabled();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844 + 1);

    const handle = page.locator('.lens-drag-handle');
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y - 40, { steps: 4 });
    await page.mouse.up();
    const movedBox = await card.boundingBox();
    expect(movedBox.y).toBeLessThan(box.y);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
