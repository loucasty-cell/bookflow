import { describe, expect, it } from "vitest";
import { validateFileDescriptor } from "./fileValidation.js";

describe("book file validation", () => {
  it("accepts supported files with matching content signatures", () => {
    expect(
      validateFileDescriptor({
        name: "novel.pdf",
        size: 1200,
        headerBytes: [0x25, 0x50, 0x44, 0x46, 0x2d],
      }),
    ).toBe("pdf");
    expect(
      validateFileDescriptor({
        name: "novel.epub",
        size: 1200,
        headerBytes: [0x50, 0x4b, 0x03, 0x04],
      }),
    ).toBe("epub");
  });

  it("rejects renamed or unsupported files", () => {
    expect(() =>
      validateFileDescriptor({
        name: "not-a-book.pdf",
        size: 1200,
        headerBytes: [0x3c, 0x68, 0x74, 0x6d, 0x6c],
      }),
    ).toThrow(/not a valid PDF book/i);
    expect(() =>
      validateFileDescriptor({ name: "archive.zip", size: 1200 }),
    ).toThrow(/supported book file/i);
  });

  it("accepts readable prose and rejects binary or HTML text", () => {
    expect(
      validateFileDescriptor({
        name: "story.txt",
        size: 160,
        textSample:
          "A reader opened the quiet book and followed the first line into a patient new world.",
      }),
    ).toBe("txt");
    expect(() =>
      validateFileDescriptor({
        name: "binary.txt",
        size: 160,
        textSample: "book\u0000\u0001\u0002data",
      }),
    ).toThrow(/readable book text/i);
    expect(() =>
      validateFileDescriptor({
        name: "page.md",
        size: 160,
        textSample: "<!doctype html><html><body>This is a saved web page, not a local book.</body></html>",
      }),
    ).toThrow(/HTML page/i);
  });
});
