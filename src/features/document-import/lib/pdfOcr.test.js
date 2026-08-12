import { describe, expect, it } from "vitest";
import {
  ocrTextToParagraphs,
  pageNeedsOcr,
  pdfPageProgress,
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
});
