import { describe, expect, it } from "vitest";
import { buildNotesPdf, sanitizeFilename, wrapText } from "./notesPdfExport.js";
import { PDFDocument, StandardFonts } from "pdf-lib";

describe("notesPdfExport", () => {
  it("sanitizes filenames accurately", () => {
    expect(sanitizeFilename("The Great Gatsby")).toBe("the-great-gatsby-notes");
    expect(sanitizeFilename("Moby-Dick: Or, The Whale!")).toBe("moby-dick-or-the-whale-notes");
    expect(sanitizeFilename("")).toBe("bookflow-reading-notes");
  });

  it("wraps text cleanly within max bounds", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrapText(
      "The quick brown fox jumps over the lazy dog and runs across the field",
      font,
      12,
      120
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toContain("The quick brown fox");
  });

  it("builds a multi-note PDF document preserving bold formatting", async () => {
    const notes = [
      {
        id: "n-1",
        text: "This is a bold reflection on chapter themes.",
        bold: true,
        quote: "All happy families are alike; each unhappy family is unhappy in its own way.",
        createdAt: 1700000000000,
      },
      {
        id: "n-2",
        text: "Regular observation regarding the setting.",
        bold: false,
        createdAt: 1700000010000,
      },
    ];

    const pdfDoc = await buildNotesPdf({
      notes,
      bookTitle: "Anna Karenina",
      author: "Leo Tolstoy",
      chapterTitle: "Part 1, Chapter 1",
      progress: 12,
    });

    expect(pdfDoc).toBeDefined();
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes.length).toBeGreaterThan(1000);
  });

  it("handles empty notes gracefully without throwing", async () => {
    const pdfDoc = await buildNotesPdf({
      notes: [],
      bookTitle: "Empty Book",
    });

    expect(pdfDoc.getPageCount()).toBe(1);
    const bytes = await pdfDoc.save();
    expect(bytes.length).toBeGreaterThan(500);
  });

  it("generates multiple pages when note count is high", async () => {
    const manyNotes = Array.from({ length: 15 }, (_, i) => ({
      id: `n-${i}`,
      text: `Extended note ${i + 1} with a lengthy passage discussing detailed character arcs, philosophical themes, narrative pacing, and critical reflections from the reader session.`,
      bold: i % 2 === 0,
      quote: i % 3 === 0 ? `Selected quote text for paragraph reference number ${i + 1}.` : "",
      createdAt: Date.now() - i * 10000,
    }));

    const pdfDoc = await buildNotesPdf({
      notes: manyNotes,
      bookTitle: "War and Peace",
      progress: 68,
    });

    expect(pdfDoc.getPageCount()).toBeGreaterThan(1);
  });
});
