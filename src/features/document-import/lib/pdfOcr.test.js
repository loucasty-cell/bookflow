import { describe, expect, it } from "vitest";
import {
  ocrDpiForScale,
  ocrTextToParagraphs,
  pageNeedsOcr,
  pdfPageProgress,
  renderScaleForDimensions,
} from "./pdfOcr.js";

describe("scanned PDF OCR helpers", () => {
  it("uses OCR only when native PDF text is missing or too sparse", () => {
    expect(pageNeedsOcr("")).toBe(true);
    expect(pageNeedsOcr("12")).toBe(true);
    expect(
      pageNeedsOcr(
        "This complete native sentence should remain the source of truth for the PDF page.",
      ),
    ).toBe(false);
  });

  it("reconstructs readable OCR paragraphs without page-number lines", () => {
    expect(
      ocrTextToParagraphs(
        "A scanned para-\ngraph keeps its original reading order.\n\n42\n\nThe next paragraph remains separate and readable.",
      ),
    ).toEqual([
      "A scanned paragraph keeps its original reading order.",
      "The next paragraph remains separate and readable.",
    ]);
  });

  it("keeps page progress monotonic and below the final ready stage", () => {
    expect(pdfPageProgress(1, 4, 0)).toBe(12);
    expect(pdfPageProgress(1, 4, 1)).toBeLessThan(
      pdfPageProgress(2, 4, 1),
    );
    expect(pdfPageProgress(4, 4, 1)).toBe(96);
  });

  it("keeps OCR image rendering inside the configured pixel budget", () => {
    expect(renderScaleForDimensions(612, 792)).toBe(2.5);
    expect(renderScaleForDimensions(6000, 8000)).toBeLessThan(0.5);
  });

  it("matches OCR DPI to the rendered page scale within safe bounds", () => {
    expect(ocrDpiForScale(1)).toBe(144);
    expect(ocrDpiForScale(2.5)).toBe(180);
    expect(ocrDpiForScale(8)).toBe(300);
  });
});
