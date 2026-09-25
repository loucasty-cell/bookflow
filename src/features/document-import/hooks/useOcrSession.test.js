import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  cells: [],
  cursor: 0,
  cleanup: null,
  effectRan: false,
}));

vi.mock("react", () => ({
  useRef: (initialValue) => {
    const index = harness.cursor;
    harness.cursor += 1;
    if (!harness.cells[index]) harness.cells[index] = { current: initialValue };
    return harness.cells[index];
  },
  useState: (initialValue) => {
    const index = harness.cursor;
    harness.cursor += 1;
    if (!harness.cells[index]) {
      const cell = {
        value: typeof initialValue === "function" ? initialValue() : initialValue,
      };
      cell.setValue = (nextValue) => {
        cell.value = typeof nextValue === "function" ? nextValue(cell.value) : nextValue;
      };
      harness.cells[index] = cell;
    }
    return [harness.cells[index].value, harness.cells[index].setValue];
  },
  useEffect: (effect) => {
    if (harness.effectRan) return;
    harness.effectRan = true;
    harness.cleanup = effect() || null;
  },
}));

vi.mock("../index.js", () => ({ MAX_FILE_SIZE: 50 * 1024 * 1024 }));

import { useOcrSession } from "./useOcrSession.js";

class FakeEventSource {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.close = vi.fn();
    FakeEventSource.instances.push(this);
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  emit(name, data) {
    this.listeners.get(name)?.({ data: JSON.stringify(data) });
  }
}

class FakeFormData {
  append() {}
}

function renderHook(callback, reset = true) {
  if (reset) {
    harness.cells = [];
    harness.cursor = 0;
    harness.cleanup = null;
    harness.effectRan = false;
  }
  harness.cursor = 0;
  return callback();
}

function rerenderHook(callback) {
  return renderHook(callback, false);
}

function makeFile(name = "book.pdf") {
  return { name, size: 1024, type: "application/pdf" };
}

async function startScan(onDocumentLoaded = vi.fn()) {
  let hook = renderHook(() => useOcrSession({ onDocumentLoaded }));
  hook.handleDrop({
    preventDefault: vi.fn(),
    dataTransfer: { files: [makeFile()] },
  });
  hook = rerenderHook(() => useOcrSession({ onDocumentLoaded }));
  await hook.startScan();
  hook = rerenderHook(() => useOcrSession({ onDocumentLoaded }));
  return {
    hook,
    onDocumentLoaded,
    source: FakeEventSource.instances.at(-1),
  };
}

describe("useOcrSession", () => {
  let originalFetch;
  let originalEventSource;
  let originalFormData;

  beforeEach(() => {
    vi.useFakeTimers();
    originalFetch = globalThis.fetch;
    originalEventSource = globalThis.EventSource;
    originalFormData = globalThis.FormData;
    FakeEventSource.instances = [];
    globalThis.EventSource = FakeEventSource;
    globalThis.FormData = FakeFormData;
    globalThis.fetch = vi.fn((url) => {
      if (String(url).includes("/api/ocr/cancel/")) {
        return Promise.resolve({ ok: true, json: vi.fn().mockResolvedValue({}) });
      }
      return Promise.resolve({
        ok: true,
        json: vi.fn().mockResolvedValue({ job_id: "job-1", total_pages: 3 }),
      });
    });
  });

  afterEach(() => {
    harness.cleanup?.();
    harness.cleanup = null;
    globalThis.fetch = originalFetch;
    globalThis.EventSource = originalEventSource;
    globalThis.FormData = originalFormData;
    vi.useRealTimers();
  });

  it("keeps progress monotonic, orders pages, filters skips, and waits for explicit completion", async () => {
    const onDocumentLoaded = vi.fn();
    const { hook, source } = await startScan(onDocumentLoaded);

    source.emit("progress", {
      current_page: 2,
      total_pages: 3,
      percent: 80,
      total_words: 5,
      latest_page: { page_number: 2, text: "Second page", success: true },
    });
    source.emit("progress", {
      current_page: 1,
      total_pages: 3,
      percent: 20,
      total_words: 2,
      latest_page: { page_number: 1, text: "First page", success: true },
    });
    const processingHook = rerenderHook(() => useOcrSession({ onDocumentLoaded }));
    expect(processingHook.progress.percent).toBe(80);
    expect(processingHook.progress.currentPage).toBe(2);
    expect(processingHook.pages.map((page) => page.page_number)).toEqual([1, 2]);

    source.emit("completed", {
      current_page: 3,
      total_pages: 3,
      percent: 100,
      total_words: 6,
      elapsed_seconds: 4,
      pages_per_second: 1.5,
      failed_pages: [2],
      pages: [
        { page_number: 3, text: "Third page", success: true },
        { page_number: 2, text: "", success: false },
        { page_number: 1, text: "First page", success: true },
      ],
    });

    const completedHook = rerenderHook(() => useOcrSession({ onDocumentLoaded }));
    expect(completedHook.progress.percent).toBe(100);
    expect(completedHook.progress.currentPage).toBe(3);
    expect(completedHook.pages.map((page) => page.page_number)).toEqual([1, 3]);
    expect(completedHook.skippedPages).toEqual([2]);
    expect(onDocumentLoaded).not.toHaveBeenCalled();

    completedHook.loadDocument({ pages: completedHook.pages });
    expect(onDocumentLoaded).toHaveBeenCalledTimes(1);
    expect(hook).toBeTruthy();
  });

  it("cancels and clears the job consistently", async () => {
    const onDocumentLoaded = vi.fn();
    const { hook, source } = await startScan(onDocumentLoaded);
    await hook.handleCancelScan();
    source.emit("completed", {
      total_pages: 1,
      pages: [{ page_number: 1, text: "Late page", success: true }],
    });
    const cancelledHook = rerenderHook(() => useOcrSession({ onDocumentLoaded }));

    expect(cancelledHook.status).toBe("idle");
    expect(cancelledHook.error).toBe("Scan was canceled.");
    expect(cancelledHook.jobId).toBeNull();
    expect(cancelledHook.pages).toEqual([]);
    expect(onDocumentLoaded).not.toHaveBeenCalled();
    expect(source.close).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/ocr/cancel/job-1", { method: "POST" });
  });

  it("resets active work and posts a cancellation request", async () => {
    const { hook, source } = await startScan();
    hook.handleReset();
    const resetHook = rerenderHook(() => useOcrSession({ onDocumentLoaded: vi.fn() }));

    expect(resetHook.status).toBe("idle");
    expect(resetHook.file).toBeNull();
    expect(resetHook.pages).toEqual([]);
    expect(source.close).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/ocr/cancel/job-1", { method: "POST" });
  });

  it("reports a completion with no readable pages as a failure", async () => {
    const { source } = await startScan();
    source.emit("completed", {
      total_pages: 2,
      pages: [
        { page_number: 1, text: "", success: false },
        { page_number: 2, text: "  ", success: true },
      ],
    });
    const failedHook = rerenderHook(() => useOcrSession({ onDocumentLoaded: vi.fn() }));

    expect(failedHook.status).toBe("failed");
    expect(failedHook.error).toContain("1, 2");
    expect(failedHook.pages).toEqual([]);
  });

  it("aborts on timeout and cleans the stream", async () => {
    const { source } = await startScan();
    vi.advanceTimersByTime(10 * 60 * 1000);
    const timedOutHook = rerenderHook(() => useOcrSession({ onDocumentLoaded: vi.fn() }));

    expect(timedOutHook.status).toBe("failed");
    expect(timedOutHook.error).toContain("timed out");
    expect(source.close).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/ocr/cancel/job-1", { method: "POST" });
  });

  it("cancels the backend job on unmount", async () => {
    const { source } = await startScan();
    harness.cleanup?.();
    harness.cleanup = null;

    expect(source.close).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/ocr/cancel/job-1", { method: "POST" });
  });
});
