import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scanPdfViaBackend } from "./backendOcrFallback.js";

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

describe("scanPdfViaBackend", () => {
  let originalFetch;
  let originalEventSource;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalEventSource = globalThis.EventSource;
    FakeEventSource.instances = [];
    globalThis.EventSource = FakeEventSource;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.EventSource = originalEventSource;
  });

  it("keeps progress monotonic and assembles pages in source order", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ job_id: "job-1", total_pages: 2 }),
    });
    globalThis.fetch = fetchMock;
    const progress = [];
    const scan = scanPdfViaBackend(
      { name: "scan.pdf" },
      (percent) => progress.push(percent),
    );

    await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    const source = FakeEventSource.instances[0];
    source.emit("progress", { percent: 80, current_page: 2, total_pages: 2 });
    source.emit("progress", { percent: 20, current_page: 1, total_pages: 2 });
    source.emit("completed", {
      pages: [
        { page_number: 2, success: true, text: "Second page" },
        { page_number: 1, success: true, text: "First page" },
      ],
      total_words: 4,
      failed_pages: [],
    });

    const result = await scan;
    expect(progress).toEqual([2, 80, 80, 99]);
    expect(result.chapters.map((chapter) => chapter.title)).toEqual(["Page 1", "Page 2"]);
    expect(source.close).toHaveBeenCalledTimes(1);
  });

  it("settles cancellation, closes the stream, and cancels the backend job", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ job_id: "job-2", total_pages: 1 }),
    });
    globalThis.fetch = fetchMock;
    const scan = scanPdfViaBackend({ name: "scan.pdf" }, vi.fn());

    await vi.waitFor(() => expect(FakeEventSource.instances).toHaveLength(1));
    const source = FakeEventSource.instances[0];
    scan.cancel();
    source.emit("completed", {
      pages: [{ page_number: 1, success: true, text: "Late page" }],
    });

    await expect(scan).rejects.toThrow("canceled");
    expect(source.close).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ocr/cancel/job-2",
      { method: "POST" },
    );
  });
});
