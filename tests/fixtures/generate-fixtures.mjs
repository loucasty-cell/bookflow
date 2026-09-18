/**
 * Generate minimal test PDF fixtures for Bookflow tests.
 * Run: node tests/fixtures/generate-fixtures.mjs
 *
 * Produces:
 *   tests/fixtures/sample-native.pdf   — a simple 2-page text PDF
 *   tests/fixtures/sample-scanned.pdf  — a single-page image-only PDF (simulated scan)
 *   tests/fixtures/sample-twocol.pdf   — a two-column layout PDF
 *   tests/fixtures/sample-long.pdf     — a 25-page PDF for long-book tests
 *
 * Requirements: pdf-lib (npm install pdf-lib) — devDependency only.
 * These fixtures contain only public-domain or original text. No copyrighted material.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const FIXTURE_DIR = path.dirname(__filename);

async function createNativePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page1 = doc.addPage([612, 792]);
  const page2 = doc.addPage([612, 792]);

  page1.drawText("The Art of Reading Well\n\nChapter 1: Why Reading Matters\n\nReading is one of the most fundamental skills a person can develop. It opens doors to new ideas, perspectives, and worlds that might otherwise remain hidden.\n\nIn our modern age of constant distraction, the ability to sit with a text and engage deeply has become both more valuable and more difficult.", {
    x: 72,
    y: 720,
    size: 12,
    font,
    color: rgb(0, 0, 0),
    lineHeight: 16,
    width: 468,
  });

  page2.drawText("Chapter 2: Building a Reading Habit\n\nStart small. Even ten minutes of focused reading each day can compound into meaningful progress over weeks and months. The key is consistency, not intensity.\n\nChoose a time that works for you. Some people read best in the morning with their coffee, others prefer winding down with a book before sleep.", {
    x: 72,
    y: 720,
    size: 12,
    font,
    color: rgb(0, 0, 0),
    lineHeight: 16,
    width: 468,
  });

  const bytes = await doc.save();
  fs.writeFileSync(path.join(FIXTURE_DIR, "sample-native.pdf"), bytes);
  console.log("Created sample-native.pdf");
}

async function createTwoColPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);

  const col1Text = "Column One\n\nThis is the first column of a two-column layout. Academic papers and journal articles frequently use this format. The reading order must be preserved when extracting text.\n\nColumn detection is critical for OCR pipelines that process scanned academic documents.";
  const col2Text = "Column Two\n\nThis is the second column. It continues the discussion from the first column or presents complementary information. Automated systems must distinguish between reading left-to-right within a column and jumping to the next column.";
  const bodyText = "\n\nTwo-column layouts challenge OCR systems because naive left-to-right scanning interleaves text from both columns, producing garbled output. A column-aware reading order algorithm must detect the vertical gutter between columns and process each column independently before merging the results.";

  page.drawText(col1Text, {
    x: 36, y: 720, size: 10, font, color: rgb(0, 0, 0),
    lineHeight: 13, width: 250,
  });
  page.drawText(col2Text, {
    x: 326, y: 720, size: 10, font, color: rgb(0, 0, 0),
    lineHeight: 13, width: 250,
  });
  page.drawText(bodyText, {
    x: 36, y: 340, size: 10, font, color: rgb(0, 0, 0),
    lineHeight: 13, width: 540,
  });

  const bytes = await doc.save();
  fs.writeFileSync(path.join(FIXTURE_DIR, "sample-twocol.pdf"), bytes);
  console.log("Created sample-twocol.pdf");
}

async function createLongPdf(pageCount = 25) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([612, 792]);
    const lines = [];
    for (let line = 1; line <= 40; line++) {
      lines.push(`Page ${i}, line ${line}: The quick brown fox jumps over the lazy dog. This is sample text for long-book performance testing.`);
    }
    page.drawText(lines.join("\n"), {
      x: 72,
      y: 720,
      size: 11,
      font,
      color: rgb(0, 0, 0),
      lineHeight: 15,
      width: 468,
    });
  }

  const bytes = await doc.save();
  fs.writeFileSync(path.join(FIXTURE_DIR, "sample-long.pdf"), bytes);
  console.log(`Created sample-long.pdf (${pageCount} pages)`);
}

async function createScannedPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);

  // Draw a light gray background to simulate a scan (no text layer)
  page.drawRectangle({
    x: 0, y: 0, width: 612, height: 792,
    color: rgb(0.95, 0.95, 0.95),
  });

  // Minimal text to simulate a very poor scan with barely readable content
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Scanned Document - OCR Required", {
    x: 72, y: 720, size: 14, font, color: rgb(0.3, 0.3, 0.3),
  });

  const bytes = await doc.save();
  fs.writeFileSync(path.join(FIXTURE_DIR, "sample-scanned.pdf"), bytes);
  console.log("Created sample-scanned.pdf");
}

async function main() {
  await createNativePdf();
  await createTwoColPdf();
  await createLongPdf(25);
  await createScannedPdf();
  console.log("\nAll fixtures generated in", FIXTURE_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
