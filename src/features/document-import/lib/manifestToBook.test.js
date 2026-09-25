import { describe, expect, it } from "vitest";
import { manifestToBook } from "./manifestToBook.js";

describe("manifestToBook", () => {
  it("keeps ready pages in source order and preserves the book payload", () => {
    const manifest = {
      title: "Scanned book",
      author: null,
      kind: "PDF",
      units: [
        {
          status: "READY",
          sourcePage: 3,
          label: "Page 3",
          paragraphs: ["Third page."],
          ocrStatus: "native",
        },
        {
          status: "FAILED",
          sourcePage: 1,
          label: "Page 1",
          paragraphs: ["Failed page."],
          ocrStatus: "native",
        },
        {
          status: "READY",
          sourcePage: 1,
          label: "Page 1",
          paragraphs: ["First page."],
          ocrStatus: "ocr-ready",
        },
        {
          status: "READY",
          sourcePage: 2,
          label: "Page 2",
          paragraphs: [],
          ocrStatus: "ocr-ready",
        },
        {
          status: "READY",
          sourcePage: 0,
          label: "Page 0",
          paragraphs: ["Unnumbered page."],
          ocrStatus: "native",
        },
      ],
    };

    expect(manifestToBook(manifest)).toEqual({
      title: "Scanned book",
      author: "",
      kind: "PDF",
      chapters: [
        { title: "Page 0", paragraphs: ["Unnumbered page."] },
        { title: "Page 1", paragraphs: ["First page."] },
        { title: "Page 3", paragraphs: ["Third page."] },
      ],
      ocrPageCount: 1,
    });
  });
});
