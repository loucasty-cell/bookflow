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

function toChapters(pages) {
  const sorted = [...(pages ?? [])].sort(
    (a, b) => (a.page_number ?? 0) - (b.page_number ?? 0),
  );
  const chapters = [];
  for (const page of sorted) {
    if (!page?.success || !page?.text?.trim()) continue;
    const paragraphs = splitParagraphs(page.text).filter(
      (paragraph) => paragraph.length > 0,
    );
    if (!paragraphs.length) continue;
    chapters.push({
      title: `Page ${page.page_number}`,
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

    const job = await started.json();
    activeJobId = job.job_id;
    const totalPages = job.total_pages || 0;

    return await new Promise((resolve, reject) => {
      const fail = (message) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(message));
      };

      const done = (pages, totalWords, failedPages = []) => {
        if (settled) return;
        settled = true;
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
