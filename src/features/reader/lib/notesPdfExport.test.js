import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildNotesPdf,
  exportNotesAsPdf,
  notesFilename,
  planNotesPdfLayout,
  sanitizeFilename,
  sanitizePdfText,
  truncateToWidth,
  wrapText,
} from "./notesPdfExport.js";
import {
  NOTES_EXPORT_STATUS,
  downloadBlob,
  revokePendingDownloads,
  runNotesPdfExport,
} from "./notesExport.js";
import { PDFDocument, StandardFonts } from "pdf-lib";

async function createFonts() {
  const doc = await PDFDocument.create();
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
}

function collectText(plan, { footer = false } = {}) {
  const lines = [];
  for (const page of plan.pages) {
    for (const op of page.ops) {
      if (op.kind !== "text") continue;
      if (!footer && op.band === "footer") continue;
      lines.push(op.text);
    }
  }
  return lines;
}

function contentTextOps(plan) {
  const ops = [];
  for (const page of plan.pages) {
    for (const op of page.ops) {
      if (op.kind === "text" && op.band !== "footer") ops.push(op);
    }
  }
  return ops;
}

function installDownloadStub() {
  const clicked = [];
  const revoked = [];
  const body = {
    children: [],
    appendChild(node) {
      this.children.push(node);
    },
    removeChild(node) {
      this.children = this.children.filter((child) => child !== node);
    },
  };

  const previousDocument = globalThis.document;
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;

  globalThis.document = {
    body,
    createElement() {
      const node = {
        style: {},
        click() {
          clicked.push(node);
        },
      };
      return node;
    },
  };
  let counter = 0;
  URL.createObjectURL = () => {
    counter += 1;
    return `blob:bookflow/${counter}`;
  };
  URL.revokeObjectURL = (url) => {
    revoked.push(url);
  };

  return {
    clicked,
    revoked,
    body,
    restore() {
      globalThis.document = previousDocument;
      URL.createObjectURL = previousCreate;
      URL.revokeObjectURL = previousRevoke;
    },
  };
}

afterEach(() => {
  revokePendingDownloads();
  vi.restoreAllMocks();
});

describe("notesPdfExport", () => {
  it("sanitizes filenames accurately", () => {
    expect(sanitizeFilename("The Great Gatsby")).toBe("the-great-gatsby-notes");
    expect(sanitizeFilename("Moby-Dick: Or, The Whale!")).toBe("moby-dick-or-the-whale-notes");
    expect(sanitizeFilename("")).toBe("bookflow-reading-notes");
  });

  it("builds one filename for every export format", () => {
    expect(notesFilename("The Great Gatsby", "pdf")).toBe("the-great-gatsby-notes.pdf");
    expect(notesFilename("The Great Gatsby", ".md")).toBe("the-great-gatsby-notes.md");
    expect(notesFilename("日本語のみ", "pdf")).toBe("bookflow-reading-notes.pdf");
    expect(notesFilename("", "md")).toBe("bookflow-reading-notes.md");
    expect(notesFilename("The Great Gatsby", "")).toBe("the-great-gatsby-notes");
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

  it("hard breaks a single word that is wider than the column", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const word = "A".repeat(400);
    const lines = wrapText(word, font, 10, 200);
    expect(lines.length).toBeGreaterThan(3);
    expect(lines.join("")).toBe(word);
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(200);
    }
  });

  it("truncates overflowing labels to the measured width", async () => {
    const fonts = await createFonts();
    const truncated = truncateToWidth("X".repeat(200), fonts.bold, 16, 300);
    expect(fonts.bold.widthOfTextAtSize(truncated, 16)).toBeLessThanOrEqual(300);
    expect(truncated.endsWith("...")).toBe(true);
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

  it("keeps every drawn line inside the measured page bounds", async () => {
    const fonts = await createFonts();
    const plan = await planNotesPdfLayout({
      notes: [
        { id: "n-1", text: "A short note.", bold: false, createdAt: 1700000000000 },
        { id: "n-2", text: "Another note.", bold: true, createdAt: 1700000000000 },
      ],
      bookTitle: "Bound Check",
      fonts,
    });

    for (const op of contentTextOps(plan)) {
      expect(op.y).toBeGreaterThanOrEqual(plan.marginBottom);
      expect(op.y + op.size).toBeLessThanOrEqual(plan.pageHeight);
      const font = fonts[op.font] ?? fonts.regular;
      expect(op.x + font.widthOfTextAtSize(op.text, op.size)).toBeLessThanOrEqual(
        plan.pageWidth - plan.marginRight + 0.01
      );
    }
  });

  it("paginates a single oversized note across pages without drawing below the margin", async () => {
    const fonts = await createFonts();
    const sentences = Array.from(
      { length: 140 },
      (_, i) =>
        `Sentence ${i + 1} records a long reflective observation about pacing, character motivation, and the quiet tension that builds across the chapter.`
    );
    const notes = [
      {
        id: "long-1",
        text: sentences.join(" "),
        bold: false,
        quote: "A single quoted passage that is deliberately long enough to occupy its own visual block inside the card.",
        createdAt: 1700000000000,
      },
    ];

    const plan = await planNotesPdfLayout({ notes, bookTitle: "Oversized Note", fonts });

    expect(plan.pageCount).toBeGreaterThan(2);
    expect(plan.noteCount).toBe(1);
    expect(plan.minContentY).toBeGreaterThanOrEqual(plan.marginBottom);
    expect(plan.maxContentRight).toBeLessThanOrEqual(plan.pageWidth - plan.marginRight + 0.01);

    const text = collectText(plan).join(" ");
    expect(text).toContain("Sentence 1 ");
    expect(text).toContain("Sentence 140 ");
    expect(text).toContain("NOTE 01 • continued");
    expect(text).toContain("Reading Notes (Continued)");
    expect(collectText(plan, { footer: true }).some((line) => line.startsWith("Page "))).toBe(true);

    for (let page = 0; page < plan.pageCount; page += 1) {
      expect(plan.pages[page].ops.length).toBeGreaterThan(0);
    }

    const pdfDoc = await buildNotesPdf({ notes, bookTitle: "Oversized Note" });
    expect(pdfDoc.getPageCount()).toBe(plan.pageCount);
    const bytes = await pdfDoc.save();
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("splits a quote that is longer than one page", async () => {
    const fonts = await createFonts();
    const quote = Array.from(
      { length: 200 },
      (_, i) => `Quoted clause ${i + 1} from the referenced passage.`
    ).join(" ");

    const plan = await planNotesPdfLayout({
      notes: [{ id: "q-1", text: "Reaction to the passage.", quote, bold: false, createdAt: 1700000000000 }],
      bookTitle: "Long Quote",
      fonts,
    });

    expect(plan.pageCount).toBeGreaterThan(1);
    expect(plan.minContentY).toBeGreaterThanOrEqual(plan.marginBottom);
    expect(collectText(plan).join(" ")).toContain("Quoted clause 200 ");
  });

  it("keeps quoted text inside the quote surface", async () => {
    const fonts = await createFonts();
    const plan = await planNotesPdfLayout({
      notes: [
        {
          id: "q-2",
          text: "Body observation about the passage.",
          quote:
            "A quoted passage that is deliberately long enough to wrap onto a second and third line for the surface bounds check.",
          bold: false,
          createdAt: 1700000000000,
        },
      ],
      bookTitle: "Quote Surface",
      fonts,
    });

    const ops = plan.pages[0].ops;
    const surfaces = ops.filter((op) => op.kind === "rect" && op.x > 50 && op.width > 50 && op.width < 500);
    expect(surfaces.length).toBeGreaterThan(0);

    const quoteTexts = ops.filter((op) => op.kind === "text" && op.font === "italic");
    expect(quoteTexts.length).toBeGreaterThan(1);

    for (const surface of surfaces) {
      const top = surface.y + surface.height;
      for (const op of quoteTexts) {
        expect(op.y + 0.718 * op.size).toBeLessThanOrEqual(top + 0.01);
        expect(op.y - 0.207 * op.size).toBeGreaterThanOrEqual(surface.y - 0.01);
        expect(op.x).toBeGreaterThanOrEqual(surface.x);
        expect(op.x).toBeLessThanOrEqual(surface.x + surface.width);
      }
    }
  });

  it("reports every unsupported glyph it replaces", async () => {
    const fonts = await createFonts();
    const result = sanitizePdfText("plain 中文 \u{1F600} end", fonts.regular);
    expect(result.text).toBe("plain ?? ? end");
    expect(result.replacements).toBe(3);
    expect(() => fonts.regular.encodeText(result.text)).not.toThrow();
    expect(sanitizePdfText("café € — ok", fonts.regular)).toEqual({ text: "café € — ok", replacements: 0 });
  });

  it("exports emoji and CJK notes without throwing and reports replacements", async () => {
    const stub = installDownloadStub();
    try {
      const result = await exportNotesAsPdf({
        notes: [
          {
            id: "emoji-1",
            text: "Loved the pacing \u{1F525} especially the 中 ending",
            quote: "引用 \u{1F4A1}",
            bold: true,
            createdAt: 1700000000000,
          },
        ],
        bookTitle: "Emoji Book 日本語",
      });

      expect(result.pages).toBeGreaterThanOrEqual(1);
      expect(result.size).toBeGreaterThan(500);
      expect(result.replacedGlyphs).toBeGreaterThan(0);
      expect(stub.clicked).toHaveLength(1);
      expect(stub.clicked[0].download).toBe("emoji-book-notes.pdf");
      expect(stub.body.children).toHaveLength(0);

      revokePendingDownloads();
      expect(stub.revoked).toEqual([stub.clicked[0].href]);
    } finally {
      stub.restore();
    }
  });

  it("revokes a superseded object URL before the next download", () => {
    const stub = installDownloadStub();
    try {
      downloadBlob(new Blob(["one"]), "one.md");
      downloadBlob(new Blob(["two"]), "two.md");
      expect(stub.revoked).toHaveLength(1);
      revokePendingDownloads();
      expect(stub.revoked).toHaveLength(2);
    } finally {
      stub.restore();
    }
  });

  it("resolves export outcomes instead of throwing", async () => {
    const success = await runNotesPdfExport({
      notes: [{ id: "a", text: "note" }],
      exportPdf: async () => ({ size: 10, pages: 1, replacedGlyphs: 2 }),
    });
    expect(success.status).toBe(NOTES_EXPORT_STATUS.SUCCESS);
    expect(success.result.replacedGlyphs).toBe(2);

    const failure = await runNotesPdfExport({
      notes: [{ id: "a", text: "note" }],
      exportPdf: async () => {
        throw new Error("boom");
      },
    });
    expect(failure.status).toBe(NOTES_EXPORT_STATUS.ERROR);
    expect(failure.message).toContain("PDF export failed");
    expect(failure.message).toContain("Markdown export");
    expect(failure.message).toContain("boom");

    const idle = await runNotesPdfExport({ notes: [], exportPdf: async () => ({}) });
    expect(idle.status).toBe(NOTES_EXPORT_STATUS.IDLE);
  });
});
