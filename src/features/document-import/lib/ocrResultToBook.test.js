import { describe, expect, it } from "vitest";
import {
  getOcrSkippedPages,
  normalizeOcrPages,
  ocrResultToBook,
} from "./ocrResultToBook.js";

describe("ocrResultToBook", () => {
  it("keeps readable pages in stable source order and reports skipped pages", () => {
    const result = ocrResultToBook({
      title: "",
      totalWords: 7,
      pages: [
        {
          page_number: 3,
          text: "# Chapter Three\n\nThird page",
          word_count: 3,
          success: true,
        },
        {
          page_number: 1,
          text: "unreadable result",
          success: false,
        },
        {
          page_number: 2,
          text: "# Chapter Two\n\nBody two\nLine three",
          word_count: 4,
          success: true,
        },
        {
          page_number: 3,
          text: "duplicate result",
          success: true,
        },
        {
          page_number: 4,
          text: "  \n\n",
          success: true,
        },
      ],
    });

    expect(result).toEqual({
      title: "OCR Document",
      author: "Hugging Face OCR",
      kind: "PDF",
      chapters: [
        {
          title: "Chapter Two",
          paragraphs: ["# Chapter Two", "Body two", "Line three"],
        },
        {
          title: "Chapter Three",
          paragraphs: ["# Chapter Three", "Third page"],
        },
      ],
      ocrPageCount: 2,
      totalWords: 7,
      skippedPages: [1, 4],
    });
  });

  it("uses the reported failed-page list when page results are omitted", () => {
    const result = ocrResultToBook({
      pages: [
        { page_number: 2, text: "Readable page", success: true },
      ],
      failed_pages: [1, 3],
    });

    expect(result.chapters).toEqual([
      { title: "Page 2", paragraphs: ["Readable page"] },
    ]);
    expect(result.skippedPages).toEqual([1, 3]);
    expect(result.totalWords).toBe(2);
  });

  it("normalizes malformed page numbers without creating empty chapters", () => {
    const pages = [
      { page_number: "invalid", text: "First readable page" },
      { page_number: 0, text: "   " },
      { page_number: "4", text: "Fourth readable page" },
    ];

    expect(normalizeOcrPages(pages).map((page) => page.page_number)).toEqual([1, 4]);
    expect(getOcrSkippedPages(pages)).toEqual([2]);
  });

  it("returns no book when every OCR page is failed or empty", () => {
    expect(
      ocrResultToBook({
        pages: [
          { page_number: 1, text: "", success: false },
          { page_number: 2, text: " \n ", success: true },
        ],
      }),
    ).toBeNull();
    expect(ocrResultToBook(null)).toBeNull();
    expect(ocrResultToBook({ pages: [] })).toBeNull();
  });
});
