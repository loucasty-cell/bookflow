import { expect, test } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function makeLongPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let pageNumber = 1; pageNumber <= 420; pageNumber += 1) {
    const page = pdf.addPage([612, 792]);
    page.drawText('Bookflow long-book performance probe', {
      x: 54,
      y: 730,
      size: 16,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`Page ${pageNumber} of 420`, {
      x: 54,
      y: 700,
      size: 12,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    for (let paragraph = 1; paragraph <= 4; paragraph += 1) {
      page.drawText(
        `Paragraph ${paragraph} on page ${pageNumber}. This is selectable text used to measure local import and reader performance. `.repeat(3),
        {
          x: 54,
          y: 650 - (paragraph - 1) * 120,
          size: 10,
          font,
          color: rgb(0.2, 0.2, 0.2),
          maxWidth: 500,
          lineHeight: 14,
        },
      );
    }
  }
  return Buffer.from(await pdf.save());
}

test('420-page import reaches 100 before the reader opens', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const file = await makeLongPdf();
  const startedAt = Date.now();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: 'bookflow-420.pdf',
    mimeType: 'application/pdf',
    buffer: file,
  });

  const progressValues = [];
  const deadline = Date.now() + 170000;
  while (Date.now() < deadline) {
    const value = await page.evaluate(() => document.querySelector('.loading-percent')?.textContent ?? null);
    if (value) {
      const percent = Number.parseInt(value, 10);
      if (Number.isFinite(percent)) progressValues.push(percent);
    }
    if (await page.evaluate(() => Boolean(document.querySelector('.app-shell')))) break;
    await page.waitForTimeout(50);
  }

  await expect(page.locator('.app-shell')).toBeVisible({ timeout: 10000 });
  expect(progressValues).toContain(100);
  expect(progressValues.every((value, index) => index === 0 || value >= progressValues[index - 1])).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const mountedSections = await page.locator('.reading-section').count();
  expect(mountedSections).toBeLessThanOrEqual(12);
  console.log(JSON.stringify({ elapsedMs: Date.now() - startedAt, progressValues, mountedSections }));
});
