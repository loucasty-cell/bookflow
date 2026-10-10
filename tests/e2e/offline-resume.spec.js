import { expect, test } from '@playwright/test';

const TITLE = 'offline-resume-probe';

function makeText() {
  const paragraphs = [];
  for (let index = 1; index <= 40; index += 1) {
    paragraphs.push(
      `Paragraph ${index}. The reader keeps walking along the quiet shore while the tide comes in and the light changes slowly over the water.`,
    );
  }
  return Buffer.from(`# Chapter One\n\n${paragraphs.join('\n\n')}\n`);
}

test('a closed tab resumes the same book from the library without re-picking the file', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="file"]').first().setInputFiles({
    name: `${TITLE}.md`,
    mimeType: 'text/markdown',
    buffer: makeText(),
  });

  await expect(page.getByRole('button', { name: 'Close book' })).toBeVisible({ timeout: 30000 });
  await page.locator('[aria-keyshortcuts="ArrowDown ArrowUp Space Escape"]').focus();
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(700);
  const savedBeforeReload = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => name.startsWith('bookflow:document:'));
    return key ? JSON.parse(localStorage.getItem(key)).activeParagraphId : null;
  });

  expect(savedBeforeReload).toMatch(/^paragraph-\d+-([1-9]\d*)$/);

  await page.reload({ waitUntil: 'domcontentloaded' });

  const library = await page.evaluate(() => JSON.parse(localStorage.getItem('bookflow:library')));
  const entry = library.entries.find((item) => item.fileName.includes(TITLE));
  expect(entry).toBeTruthy();
  expect(entry.offline).toBe(true);
  expect(entry.progress).toBeGreaterThan(0);

  let pickerOpened = false;
  page.on('filechooser', () => {
    pickerOpened = true;
  });
  await page.getByRole('button', { name: /^Resume offline resume probe$/ }).first().click();
  await expect(page.getByRole('button', { name: 'Close book' })).toBeVisible({ timeout: 15000 });
  expect(pickerOpened).toBe(false);

  await page.waitForTimeout(800);
  const restored = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => name.startsWith('bookflow:document:'));
    return key ? JSON.parse(localStorage.getItem(key)).activeParagraphId : null;
  });
  expect(restored).toBe(savedBeforeReload);
});
