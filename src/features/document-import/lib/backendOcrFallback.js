import { splitParagraphs } from "../../../shared/lib/text.js";

function apiBase() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, "");
  }
  return "";
}

function displayBase() {
  return apiBase() || "http://localhost:8000";
}

const SCAN_TIMEOUT_MS = 10 * 60 * 1000;

function toChapters(pages) {
  const sorted = [...(pages ?? [])].sort((a, b) => {
    const aNum = Number(a?.page_number);
    const bNum = Number(b?.page_number);
    const aKey = Number.isFinite(aNum) ? aNum : Number.MAX_SAFE_INTEGER;
    const bKey = Number.isFinite(bNum) ? bNum : Number.MAX_SAFE_INTEGER;
    return aKey - bKey;
  });
  const chapters = [];
  const seen = new Set();
  for (const page of sorted) {
    if (!page?.success || !String(page?.text ?? '').trim()) continue;
    const numericLabel = Number(page.page_number);
    const label = Number.isFinite(numericLabel) ? numericLabel : chapters.length + 1;
    if (seen.has(label)) continue;
    seen.add(label);
    const paragraphs = splitParagraphs(page.text).filter(
      (paragraph) => paragraph.length > 0,
    );
    if (!paragraphs.length) continue;
    chapters.push({
      title: `Page ${label}`,
      paragraphs,
    });
  }
  return chapters;
}

export function isBackendFallbackError(error) {
  return /accelerated backend scan may still read it/i.test(
    String(error?.message ?? ""),
  );
}

export function scanPdfViaBackend(file, onProgress, options = {}) {
  const { signal, batchSize = 16, ocrProfile = "small" } = options;
  const base = apiBase();
  let settled = false;
  let eventSource = null;
  let activeJobId = null;

  const cleanup = () => {
    try {
      eventSource?.close();
    } catch {
      // EventSource already closed.
    }
    eventSource = null;
    if (signal) signal.removeEventListener("abort", cancel);
  };

  const cancel = () => {
    if (settled) return;
    settled = true;
    cleanup();
    if (activeJobId) {
      fetch(`${base}/api/ocr/cancel/${activeJobId}`, {
        method: "POST",
      }).catch(() => undefined);
    }
  };

  if (signal) {
    if (signal.aborted) cancel();
    else signal.addEventListener("abort", cancel, { once: true });
  }

  const promise = (async () => {
    onProgress?.(
      2,
      "Local reading failed, trying the accelerated backend scan...",
      "Your file is uploaded only because local parsing could not read it. Cancel anytime.",
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("batch_size", String(batchSize));
    formData.append("ocr_profile", ocrProfile);

    let started;
    try {
      started = await fetch(`${base}/api/ocr/scan`, {
        method: "POST",
        body: formData,
        signal,
      });
    } catch {
      if (signal?.aborted) throw new Error("Backend scan was canceled.");
      throw new Error(
        `Cannot reach the OCR backend at ${displayBase()}. Start it, then retry.`,
      );
    }

    if (!started.ok) {
      const detail = await started.json().catch(() => null);
      throw new Error(
        detail?.detail || `Backend scan failed with status ${started.status}.`,
      );
    }

    let job = null;
    try {
      job = await started.json();
    } catch {
      throw new Error("Backend scan returned an unreadable response.");
    }
    if (!job?.job_id) {
      throw new Error("Backend scan did not return a job. Try again.");
    }
    activeJobId = job.job_id;
    const totalPages = job.total_pages || 0;

    return await new Promise((resolve, reject) => {
      const timeoutId = globalThis.setTimeout(() => {
        fail("Backend scan timed out after 10 minutes. Try a smaller file or retry.");
      }, SCAN_TIMEOUT_MS);
      const clearScanTimeout = () => globalThis.clearTimeout(timeoutId);
      const fail = (message) => {
        if (settled) return;
        settled = true;
        clearScanTimeout();
        cleanup();
        reject(new Error(message));
      };

      const done = (pages, totalWords, failedPages = []) => {
        if (settled) return;
        settled = true;
        clearScanTimeout();
        cleanup();
        const chapters = toChapters(pages);
        if (!chapters.length) {
          reject(
            new Error(
              "The backend scan finished but found no readable text in this PDF.",
            ),
          );
          return;
        }
        resolve({
          title: (file.name || "Scanned document").replace(/\.pdf$/i, ""),
          author: "",
          kind: "PDF",
          chapters,
          ocrPageCount: chapters.length,
          totalWords: totalWords ?? 0,
          skippedPages: failedPages,
        });
      };

      let source;
      try {
        source = new EventSource(`${base}/api/ocr/progress/${activeJobId}`);
      } catch {
        fail(
          `Cannot stream backend progress at ${displayBase()}. Check the backend, then retry.`,
        );
        return;
      }
      eventSource = source;

      source.addEventListener("initial", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === "completed") {
            onProgress?.(99, "Backend scan complete", "Assembling pages.");
            done(data.pages, data.total_words, data.failed_pages);
            return;
          }
          if (data.status === "failed" || data.status === "canceled") {
            fail(data.error || "Backend scan did not complete.");
            return;
          }
          const percent = Math.min(
            99,
            Math.max(3, Math.round(data.percent ?? 3)),
          );
          onProgress?.(
            percent,
            `Backend scanning page ${data.current_page || 0} of ${data.total_pages || totalPages}`,
            "Repair-tolerant backend scan in progress. Cancel anytime.",
          );
        } catch {
          // Malformed progress frame; the stream continues.
        }
      });

      source.addEventListener("progress", (event) => {
        try {
          const data = JSON.parse(event.data);
          const raw =
            typeof data.percent === "number"
              ? data.percent
              : totalPages
                ? (data.current_page / totalPages) * 100
                : 50;
          const percent = Math.min(99, Math.max(4, Math.round(raw)));
          onProgress?.(
            percent,
            `Backend scanning page ${data.current_page} of ${data.total_pages}`,
            `${(data.total_words ?? 0).toLocaleString()} words so far. Cancel anytime.`,
          );
        } catch {
          // Malformed progress frame; the stream continues.
        }
      });

      source.addEventListener("completed", (event) => {
        try {
          const data = JSON.parse(event.data);
          onProgress?.(99, "Backend scan complete", "Assembling pages.");
          done(data.pages, data.total_words, data.failed_pages);
        } catch {
          fail("Backend scan finished with an unreadable response.");
        }
      });

      source.addEventListener("error", (event) => {
        if (event?.data) {
          try {
            const data = JSON.parse(event.data);
            fail(data.error || "Backend scan did not complete.");
            return;
          } catch {
            // Fall through to generic failure.
          }
        }
        fail("Backend scan did not complete.");
      });
    });
  })();

  promise.cancel = cancel;
  return promise;
}
