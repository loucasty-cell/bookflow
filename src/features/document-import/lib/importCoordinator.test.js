import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openPdfDocument: vi.fn(),
  validateBookFile: vi.fn(),
  createPdfOcrScheduler: vi.fn(),
  recognizePdfPage: vi.fn(),
}));

vi.mock("./pdfDocument.js", () => ({
  classifyPdfOpenError: () => null,
  openPdfDocument: mocks.openPdfDocument,
}));

vi.mock("./fileValidation.js", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    validateBookFile: mocks.validateBookFile,
  };
});

vi.mock("./pdfOcr.js", async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    createPdfOcrScheduler: mocks.createPdfOcrScheduler,
    recognizePdfPage: mocks.recognizePdfPage,
  };
});

import { progressivePdfImport } from "./importCoordinator.js";
import { manifestToBook } from "./manifestToBook.js";

const readableText = "This is a complete native document page with enough words and characters to avoid local OCR. It remains readable and preserves the original page order.";

function makeFile() {
  return {
    name: "book.pdf",
    size: 120,
    lastModified: 1,
    arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70]).buffer),
  };
}

function makePage(text = readableText) {
  return {
    getTextContent: vi.fn().mockResolvedValue({
      items: text
        ? [{ str: text, transform: [1, 0, 0, 1, 0, 0], hasEOL: true }]
        : [],
    }),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}

function makePdf(pages) {
  return {
    numPages: pages.length,
    getMetadata: vi.fn().mockResolvedValue({ info: {} }),
    getPage: vi.fn(async (pageNumber) => pages[pageNumber - 1]),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.validateBookFile.mockResolvedValue("pdf");
  mocks.createPdfOcrScheduler.mockResolvedValue({ terminate: vi.fn().mockResolvedValue(undefined) });
  mocks.recognizePdfPage.mockResolvedValue({ paragraphs: [readableText], confidence: 95 });
});

describe("progressivePdfImport", () => {
  it("keeps progress monotonic, preserves order, and tears down once at terminal completion", async () => {
    const pages = [makePage(), makePage()];
    const pdf = makePdf(pages);
    mocks.openPdfDocument.mockResolvedValue(pdf);
    const events = [];

    const handle = await progressivePdfImport(makeFile(), (event) => events.push(event));
    const completion = await handle.waitForCompletion();
    await handle.dispose();

    expect(completion.status).toBe("complete");
    expect(handle.getProgress()).toBe(100);
    expect(events.at(-1)).toMatchObject({ phase: "complete", progress: 100 });
    expect(events.map((event) => event.progress)).toEqual(
      [...events.map((event) => event.progress)].sort((a, b) => a - b),
    );
    expect(manifestToBook(handle.manifest).chapters.map((chapter) => chapter.title)).toEqual([
      "Page 1",
      "Page 2",
    ]);
    expect(pdf.destroy).toHaveBeenCalledTimes(1);
    expect(pages[0].cleanup).toHaveBeenCalledTimes(1);
    expect(pages[1].cleanup).toHaveBeenCalledTimes(1);
  });

  it("reports a terminal page failure instead of a complete partial book", async () => {
    const pages = [makePage(), makePage()];
    pages[1].getTextContent.mockRejectedValue(new Error("page decode failed"));
    const pdf = makePdf(pages);
    mocks.openPdfDocument.mockResolvedValue(pdf);
    const events = [];

    const handle = await progressivePdfImport(makeFile(), (event) => events.push(event));
    const completion = await handle.waitForCompletion();
    await handle.dispose();

    expect(completion.status).toBe("failed");
    expect(completion.failedUnits).toEqual([
      expect.objectContaining({ sourcePage: 2, error: "page decode failed" }),
    ]);
    expect(events.at(-1)).toMatchObject({ phase: "failed", progress: 100 });
    expect(manifestToBook(handle.manifest).chapters).toHaveLength(1);
  });

  it("terminates the shared OCR worker at terminal completion", async () => {
    const worker = { terminate: vi.fn().mockResolvedValue(undefined) };
    mocks.createPdfOcrScheduler.mockResolvedValue(worker);
    const pages = [makePage(""), makePage("")];
    const pdf = makePdf(pages);
    mocks.openPdfDocument.mockResolvedValue(pdf);

    const handle = await progressivePdfImport(makeFile());
    const completion = await handle.waitForCompletion();
    await handle.dispose();

    expect(completion.status).toBe("complete");
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(pdf.destroy).toHaveBeenCalledTimes(1);
  });

  it("settles cancellation and releases pending pages and the PDF", async () => {
    const firstPage = makePage();
    const secondPage = makePage();
    let releaseSecondPage;
    const secondPageText = new Promise((resolve) => {
      releaseSecondPage = resolve;
    });
    secondPage.getTextContent.mockImplementation(() => secondPageText);
    const pdf = makePdf([firstPage, secondPage]);
    mocks.openPdfDocument.mockResolvedValue(pdf);

    const handle = await progressivePdfImport(makeFile());
    const cancelPromise = handle.cancel();
    releaseSecondPage({
      items: [{ str: readableText, transform: [1, 0, 0, 1, 0, 0], hasEOL: true }],
    });
    const completion = await handle.waitForCompletion();
    await cancelPromise;

    expect(completion.cancelled).toBe(true);
    expect(firstPage.cleanup).toHaveBeenCalledTimes(1);
    expect(secondPage.cleanup).toHaveBeenCalledTimes(1);
    expect(pdf.destroy).toHaveBeenCalledTimes(1);
  });
});
