import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  effectCleanup: null,
  progressivePdfImport: vi.fn(),
  parseDocument: vi.fn(),
  manifestToBook: vi.fn(),
}));

vi.mock("react", () => ({
  useRef: (initialValue) => ({ current: initialValue }),
  useCallback: (callback) => callback,
  useEffect: (effect) => {
    effect();
    mocks.effectCleanup = effect();
  },
}));

vi.mock("../../../shared/lib/index.js", () => ({
  documentId: (file) => `${file.name}:${file.size}:${file.lastModified}`,
  mark: vi.fn(),
}));

vi.mock("../lib/importCoordinator.js", () => ({
  progressivePdfImport: mocks.progressivePdfImport,
}));

vi.mock("../lib/documentParsers.js", () => ({
  parseDocument: mocks.parseDocument,
}));

vi.mock("../lib/manifestToBook.js", () => ({
  manifestToBook: mocks.manifestToBook,
}));

vi.mock("../lib/ocrResultToBook.js", () => ({
  ocrResultToBook: vi.fn(),
}));

import { useDocumentImport } from "./useDocumentImport.js";

const book = {
  title: "Book",
  author: "",
  kind: "PDF",
  chapters: [{ title: "Page 1", paragraphs: ["Readable text."] }],
};

function makeFile(name = "book.pdf") {
  return { name, size: 10, lastModified: 1 };
}

function makeHandle(overrides = {}) {
  return {
    manifest: {
      title: "Book",
      author: "",
      kind: "PDF",
      totalUnits: 1,
      units: [{ sourcePage: 1, status: "READY", paragraphs: ["Readable text."] }],
    },
    getProgress: () => 100,
    waitForCompletion: () => Promise.resolve({ status: "complete", progress: 100, failedUnits: [] }),
    dispose: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.effectCleanup = null;
  mocks.manifestToBook.mockReturnValue(book);
  mocks.parseDocument.mockRejectedValue(new Error("local parser failed"));
  mocks.progressivePdfImport.mockReset();
});

describe("useDocumentImport", () => {
  it("keeps the reader closed until progressive completion", async () => {
    let resolveCompletion;
    const completion = new Promise((resolve) => {
      resolveCompletion = resolve;
    });
    const handle = makeHandle({ waitForCompletion: () => completion });
    mocks.progressivePdfImport.mockResolvedValue(handle);
    const openBook = vi.fn();
    const setBook = vi.fn();
    const setLoading = vi.fn();
    const setError = vi.fn();
    const fileInputRef = { current: { value: "book.pdf" } };
    const hook = useDocumentImport({
      fileInputRef,
      openBook,
      setBook,
      setLoading,
      setError,
      setOcrOpen: vi.fn(),
    });

    const importPromise = hook.handleFile(makeFile());
    await vi.waitFor(() => expect(mocks.progressivePdfImport).toHaveBeenCalledTimes(1));
    expect(openBook).not.toHaveBeenCalled();

    resolveCompletion({ status: "complete", progress: 100, failedUnits: [] });
    await vi.runAllTimersAsync();
    await importPromise;

    expect(openBook).toHaveBeenCalledTimes(1);
    expect(setBook).toHaveBeenCalledWith(book);
  });

  it("does not let a stale import open or clear the active request", async () => {
    let resolveFirst;
    const firstImport = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const firstHandle = makeHandle();
    const secondHandle = makeHandle();
    mocks.progressivePdfImport
      .mockImplementationOnce(() => firstImport)
      .mockResolvedValueOnce(secondHandle);
    const openBook = vi.fn();
    const setLoading = vi.fn();
    const setError = vi.fn();
    const hook = useDocumentImport({
      fileInputRef: { current: { value: "" } },
      openBook,
      setBook: vi.fn(),
      setLoading,
      setError,
      setOcrOpen: vi.fn(),
    });

    const firstPromise = hook.handleFile(makeFile("first.pdf"));
    await vi.waitFor(() => expect(mocks.progressivePdfImport).toHaveBeenCalledTimes(1));
    const secondPromise = hook.handleFile(makeFile("second.pdf"));
    setError.mockClear();
    resolveFirst(firstHandle);
    await firstPromise;
    await vi.runAllTimersAsync();
    await secondPromise;

    expect(openBook).toHaveBeenCalledTimes(1);
    expect(openBook).toHaveBeenCalledWith(book, "second.pdf:10:1");
    expect(firstHandle.dispose).toHaveBeenCalled();
    expect(setError).not.toHaveBeenCalled();
  });

  it("cancels the completion delay and unmount cleanup prevents state changes", async () => {
    mocks.progressivePdfImport.mockResolvedValue(makeHandle());
    const openBook = vi.fn();
    const setLoading = vi.fn();
    const setError = vi.fn();
    const hook = useDocumentImport({
      fileInputRef: { current: { value: "" } },
      openBook,
      setBook: vi.fn(),
      setLoading,
      setError,
      setOcrOpen: vi.fn(),
    });

    const importPromise = hook.handleFile(makeFile());
    await vi.waitFor(() => expect(mocks.progressivePdfImport).toHaveBeenCalledTimes(1));
    setError.mockClear();
    hook.cancelActiveImport();
    await vi.runAllTimersAsync();
    await importPromise;
    expect(openBook).not.toHaveBeenCalled();

    const loadingCallsBeforeUnmount = setLoading.mock.calls.length;
    mocks.effectCleanup?.();
    const unmountedPromise = hook.handleFile(makeFile("unmounted.pdf"));
    await vi.runAllTimersAsync();
    await unmountedPromise;
    expect(setLoading.mock.calls.length).toBe(loadingCallsBeforeUnmount);
    expect(setError).not.toHaveBeenCalled();
    expect(openBook).not.toHaveBeenCalled();
  });

  it("does not fall through to a partial book after a terminal progressive failure", async () => {
    mocks.progressivePdfImport.mockResolvedValue(makeHandle({
      waitForCompletion: () => Promise.resolve({
        status: "failed",
        progress: 100,
        failedUnits: [{ sourcePage: 2, error: "decode failed" }],
      }),
    }));
    const openBook = vi.fn();
    const setError = vi.fn();
    const hook = useDocumentImport({
      fileInputRef: { current: { value: "" } },
      openBook,
      setBook: vi.fn(),
      setLoading: vi.fn(),
      setError,
      setOcrOpen: vi.fn(),
    });

    await hook.handleFile(makeFile());

    expect(openBook).not.toHaveBeenCalled();
    expect(mocks.parseDocument).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith(expect.stringContaining("page 2"));
  });

  it("reports a local failure with an explicit optional OCR action", async () => {
    mocks.progressivePdfImport.mockRejectedValue(
      new Error("Local OCR could not find readable English text in this PDF."),
    );
    const fetchMock = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchMock;
    try {
      const setError = vi.fn();
      const hook = useDocumentImport({
        fileInputRef: { current: { value: "" } },
        openBook: vi.fn(),
        setBook: vi.fn(),
        setLoading: vi.fn(),
        setError,
        setOcrOpen: vi.fn(),
      });
      await hook.handleFile(makeFile());
      expect(fetchMock).not.toHaveBeenCalled();
      expect(setError).toHaveBeenCalledWith(
        expect.stringContaining("Optional accelerated OCR"),
      );
      expect(setError).toHaveBeenCalledWith(
        expect.stringContaining("nothing is uploaded until you explicitly start it"),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
