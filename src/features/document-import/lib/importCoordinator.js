/**
 * ImportCoordinator: orchestrates manifest-first progressive import.
 *
 * Flow:
 *   1. Validate file -> create manifest with per-unit entries (immediate)
 *   2. For each unit: queue with priority CURRENT > NEXT > BACKGROUND
 *   3. First ready unit signals the reader can open
 *   4. Cancel stale work on user navigation
 *   5. Persist completed units atomically
 *
 * This module replaces the blocking all-at-once approach in pdfParser.js
 * with a unit-by-unit streaming model.
 */

import {
  createManifest,
  addUnit,
  getFirstReadyUnit,
  manifestProgress,
  UnitStatus,
  getUnitsByStatus,
  requeueUnit,
} from "./documentManifest.js";
import { createImportScheduler } from "./importScheduler.js";
import { mark } from "../../../shared/lib/perfMarks.js";
import {
  normalizeText,
  splitParagraphs,
} from "../../../shared/lib/text.js";
import { pageNeedsOcr, createPdfOcrScheduler, recognizePdfPage } from "./pdfOcr.js";
import { classifyPdfOpenError, openPdfDocument } from "./pdfDocument.js";
import {
  parseXml,
  xmlElements,
  resolveArchivePath,
  collectContentBlocks,
  buildEpubSections,
  chapterFromSections,
} from "./epubUtils.js";
import { cleanTitle as cleanT, parseTextDocument } from "./textParser.js";
import { markReady as markUnitReady, markFailed as markUnitFailed } from "./documentManifest.js";
import { validateBookFile, MAX_FILE_SIZE } from "./fileValidation.js";

const MAX_ARCHIVE_ENTRIES = 3000;
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_TEXT_BYTES = 50 * 1024 * 1024;

function createImportAbortError() {
  const error = new Error("Import canceled.");
  error.name = "AbortError";
  return error;
}

function isTerminalUnit(unit) {
  return unit.status === UnitStatus.READY ||
    unit.status === UnitStatus.FAILED ||
    unit.status === UnitStatus.CANCELLED;
}

async function terminateOcrScheduler(scheduler) {
  if (!scheduler?.terminate) return;
  try {
    await scheduler.terminate();
  } catch {
    return;
  }
}

async function destroyPdfDocument(pdf) {
  if (!pdf?.destroy) return;
  try {
    await pdf.destroy();
  } catch {
    return;
  }
}

async function readPdfMetadata(pdf, signal) {
  const metadataPromise = Promise.resolve(pdf.getMetadata()).catch(() => null);
  if (!signal) return metadataPromise;
  let abortHandler;
  const abortPromise = new Promise((_, reject) => {
    abortHandler = () => reject(createImportAbortError());
    if (signal.aborted) abortHandler();
    else signal.addEventListener("abort", abortHandler, { once: true });
  });
  try {
    return await Promise.race([metadataPromise, abortPromise]);
  } finally {
    if (abortHandler) signal.removeEventListener("abort", abortHandler);
  }
}

function cancelWithoutThrow(action) {
  try {
    const result = action?.();
    if (result && typeof result.catch === "function") result.catch(() => undefined);
  } catch {
    return;
  }
}

// --- PDF progressive import ---

export async function progressivePdfImport(file, onProgress, options = {}) {
  const { signal } = options;
  mark("import-selected");
  await validateBookFile(file);
  if (signal?.aborted) throw createImportAbortError();

  const [pdfjs] = await Promise.all([import("pdfjs-dist")]);
  if (signal?.aborted) throw createImportAbortError();

  const data = new Uint8Array(await file.arrayBuffer());
  let pdf;
  try {
    pdf = await openPdfDocument(pdfjs, data);
  } catch (error) {
    if (signal?.aborted) throw createImportAbortError();
    throw classifyPdfOpenError(error) ?? new Error(
      "This PDF looks damaged, but the accelerated backend scan may still read it.",
    );
  }
  if (signal?.aborted) {
    await destroyPdfDocument(pdf);
    throw createImportAbortError();
  }

  let metadata;
  try {
    metadata = await readPdfMetadata(pdf, signal);
  } catch (error) {
    await destroyPdfDocument(pdf);
    throw error;
  }
  if (signal?.aborted) {
    await destroyPdfDocument(pdf);
    throw createImportAbortError();
  }
  const documentTitle = normalizeText(metadata?.info?.Title) || cleanT(file.name);
  const id = `${file.name}:${file.size}:${file.lastModified}`;

  mark("validation-done");

  const manifest = createManifest({
    documentId: id,
    title: documentTitle,
    author: normalizeText(metadata?.info?.Author),
    kind: "PDF",
    totalUnits: pdf.numPages,
  });
  const unitEntries = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const unit = addUnit(manifest, {
      label: `Page ${pageNumber}`,
      sourcePage: pageNumber,
      kind: "PDF_PAGE",
    });
    unitEntries.push({ unit });
  }

  let lastProgress = 0;
  const reportProgress = (phase, unit, value, extra = {}) => {
    if (teardownStarted && phase !== "cancelled") return;
    const numeric = Number.isFinite(Number(value)) ? Number(value) : manifestProgress(manifest);
    const progress = phase === "complete" || phase === "failed"
      ? 100
      : Math.max(lastProgress, Math.min(99, Math.round(numeric)));
    lastProgress = progress;
    try {
      onProgress?.({ manifest, phase, unit, progress, ...extra });
    } catch {
      return;
    }
  };

  let firstReadyResolve = null;
  let firstReadyReject = null;
  const firstReadyPromise = new Promise((resolve, reject) => {
    firstReadyResolve = resolve;
    firstReadyReject = reject;
  });
  let terminalResolve;
  const completion = new Promise((resolve) => {
    terminalResolve = resolve;
  });
  let terminalSettled = false;
  let cancelled = false;
  let teardownStarted = false;
  let teardownPromise = null;
  let scheduler = null;
  let sharedOcrScheduler = null;
  let sharedOcrReady = null;
  let abortHandler = null;
  const pendingJobs = new Set();
  const settledUnitIds = new Set();
  let readyCount = 0;
  const totalUnits = unitEntries.length;

  const getFailedUnits = () => manifest.units
    .filter((unit) => unit.status === UnitStatus.FAILED || unit.status === UnitStatus.CANCELLED)
    .map((unit) => ({
      id: unit.id,
      sourcePage: unit.sourcePage,
      label: unit.label,
      error: unit.error || "Page processing was canceled.",
    }));

  const settleCancelled = () => {
    if (terminalSettled) return;
    terminalSettled = true;
    terminalResolve({
      cancelled: true,
      failedUnits: getFailedUnits(),
      progress: manifestProgress(manifest),
      status: "cancelled",
    });
  };

  const teardown = () => {
    if (teardownPromise) return teardownPromise;
    teardownStarted = true;
    const pendingOcr = sharedOcrReady ? sharedOcrReady.catch(() => null) : null;
    const currentOcr = sharedOcrScheduler;
    teardownPromise = (async () => {
      scheduler?.cancelAll();
      const workerCleanup = (async () => {
        const resolvedOcr = pendingOcr ? await pendingOcr : currentOcr;
        const schedulers = [...new Set([currentOcr, resolvedOcr].filter(Boolean))];
        await Promise.all(schedulers.map(terminateOcrScheduler));
        if (sharedOcrScheduler === currentOcr || sharedOcrScheduler === resolvedOcr) {
          sharedOcrScheduler = null;
          sharedOcrReady = null;
        }
      })();
      const pendingCleanup = Promise.allSettled([...pendingJobs, workerCleanup]);
      if (cancelled) {
        await destroyPdfDocument(pdf);
        void pendingCleanup;
      } else {
        await pendingCleanup;
        await destroyPdfDocument(pdf);
      }
      if (signal && abortHandler) signal.removeEventListener("abort", abortHandler);
    })();
    return teardownPromise;
  };

  const terminateCurrentOcr = (workerScheduler) => {
    if (sharedOcrScheduler === workerScheduler) {
      sharedOcrScheduler = null;
      sharedOcrReady = null;
    }
    cancelWithoutThrow(() => terminateOcrScheduler(workerScheduler));
  };

  const getSharedOcrScheduler = async () => {
    if (cancelled || teardownStarted || signal?.aborted) throw createImportAbortError();
    if (sharedOcrScheduler) return sharedOcrScheduler;
    if (!sharedOcrReady) {
      sharedOcrReady = createPdfOcrScheduler(() => {})
        .then(async (workerScheduler) => {
          if (cancelled || teardownStarted || signal?.aborted) {
            await terminateOcrScheduler(workerScheduler);
            throw createImportAbortError();
          }
          sharedOcrScheduler = workerScheduler;
          return workerScheduler;
        })
        .catch((error) => {
          sharedOcrReady = null;
          sharedOcrScheduler = null;
          throw error;
        });
    }
    return sharedOcrReady;
  };

  const trackJob = (job) => {
    const promise = job();
    pendingJobs.add(promise);
    return promise.finally(() => pendingJobs.delete(promise));
  };

  const processPage = async (unit, abortSignal) => {
    let page = null;
    try {
      page = await pdf.getPage(unit.sourcePage);
      if (abortSignal.aborted) throw createImportAbortError();

      const content = await page.getTextContent({ normalizeWhitespace: true });
      if (abortSignal.aborted) throw createImportAbortError();
      const lines = [];
      let currentLine = [];
      let lastY = null;
      for (const item of content.items ?? []) {
        const value = item.str?.trim();
        if (!value) continue;
        const y = Math.round(item.transform?.[5] ?? 0);
        if (lastY !== null && Math.abs(y - lastY) > 4 && currentLine.length) {
          lines.push(currentLine.join(" "));
          currentLine = [];
        }
        currentLine.push(value);
        if (item.hasEOL) {
          lines.push(currentLine.join(" "));
          currentLine = [];
        }
        lastY = y;
      }
      if (currentLine.length) lines.push(currentLine.join(" "));

      const nativeText = lines.join("\n");
      if (!pageNeedsOcr(nativeText)) {
        const cleaned = lines
          .filter((line) => !(unit.sourcePage === 1 && normalizeText(line) === documentTitle))
          .join("\n");
        const paragraphs = splitParagraphs(cleaned).filter((paragraph) => paragraph.length > 15);
        if (!paragraphs.length) return null;
        return {
          text: cleaned,
          paragraphs,
          confidence: null,
          ocrStatus: "native",
        };
      }

      const workerScheduler = await getSharedOcrScheduler();
      if (abortSignal.aborted) throw createImportAbortError();
      let recognized;
      try {
        recognized = await recognizePdfPage(workerScheduler, page);
      } catch (ocrError) {
        if (/timed out/i.test(ocrError?.message ?? "")) terminateCurrentOcr(workerScheduler);
        throw ocrError;
      }
      if (abortSignal.aborted) throw createImportAbortError();
      if (!recognized.paragraphs?.length) return null;
      return {
        text: recognized.paragraphs.join("\n"),
        paragraphs: recognized.paragraphs,
        confidence: recognized.confidence,
        ocrStatus: "ocr-ready",
      };
    } finally {
      if (page) {
        try {
          await page.cleanup();
        } catch {
          void 0;
        }
      }
    }
  };

  const finishTerminal = () => {
    if (terminalSettled || cancelled) return;
    if (manifest.units.some((unit) => !isTerminalUnit(unit))) return;
    terminalSettled = true;
    const failedUnits = getFailedUnits();
    if (readyCount === 0 && firstReadyReject) {
      const error = new Error("Local OCR could not find readable English text in this PDF. Try a clearer, upright scan or an OCR-ready copy.");
      error.importTerminal = true;
      firstReadyReject(error);
      firstReadyResolve = null;
      firstReadyReject = null;
    }
    const phase = failedUnits.length ? "failed" : "complete";
    reportProgress(phase, null, 100, { failedUnits });
    terminalResolve({
      cancelled: false,
      failedUnits,
      progress: 100,
      status: phase,
    });
    void teardown();
  };

  scheduler = createImportScheduler({
    onUnitReady: (unit) => {
      if (settledUnitIds.has(unit.id)) return;
      settledUnitIds.add(unit.id);
      readyCount += 1;
      reportProgress("unit-ready", unit, manifestProgress(manifest));
      if (readyCount === 1 && firstReadyResolve) {
        firstReadyResolve(unit);
        firstReadyResolve = null;
        firstReadyReject = null;
      }
      finishTerminal();
    },
    onUnitFailed: (unit) => {
      if (settledUnitIds.has(unit.id)) return;
      settledUnitIds.add(unit.id);
      reportProgress("unit-failed", unit, manifestProgress(manifest));
      finishTerminal();
    },
    onProgress: () => {
      if (!terminalSettled) {
        reportProgress("scheduler-tick", null, manifestProgress(manifest));
        finishTerminal();
      }
    },
  });

  const scheduleFromPosition = (startIndex) => {
    if (cancelled || teardownStarted) return;
    const safeStart = Math.max(0, Math.min(startIndex, unitEntries.length));
    for (let index = safeStart; index < unitEntries.length; index += 1) {
      const { unit } = unitEntries[index];
      if (unit.status === UnitStatus.CANCELLED) {
        requeueUnit(unit);
        settledUnitIds.delete(unit.id);
      }
      if (unit.status !== UnitStatus.UNSEEN) continue;
      const distance = index - safeStart;
      const priority = distance === 0 ? 0 : distance <= 2 ? 1 : 3;
      scheduler.enqueue(unit, priority, (queuedUnit, abortSignal) =>
        trackJob(() => processPage(queuedUnit, abortSignal)),
      );
    }
  };

  if (signal) {
    abortHandler = () => {
      if (cancelled) return;
      cancelled = true;
      scheduler.cancelAll();
      if (firstReadyReject) {
        firstReadyReject(createImportAbortError());
        firstReadyResolve = null;
        firstReadyReject = null;
      }
      settleCancelled();
      void teardown();
    };
    if (signal.aborted) abortHandler();
    else signal.addEventListener("abort", abortHandler, { once: true });
  }

  reportProgress("manifest-ready", null, 0);
  scheduleFromPosition(0);
  if (totalUnits === 0) {
    const error = new Error("This PDF does not contain any pages.");
    error.importTerminal = true;
    firstReadyReject?.(error);
    finishTerminal();
  }

  let firstUnit;
  try {
    firstUnit = await firstReadyPromise;
  } catch (error) {
    await teardown();
    throw error;
  }
  if (cancelled || signal?.aborted) {
    await teardown();
    throw createImportAbortError();
  }

  const cancel = () => {
    if (!cancelled) {
      cancelled = true;
      scheduler.cancelAll();
      settleCancelled();
    }
    return teardown();
  };

  const dispose = () => {
    if (!terminalSettled && !cancelled) {
      cancelled = true;
      scheduler.cancelAll();
      settleCancelled();
    }
    return teardown();
  };

  return {
    manifest,
    firstUnit,
    scheduler,
    jumpToUnit: (unitIndex) => {
      if (cancelled || teardownStarted) return;
      const index = Math.max(0, Math.min(unitIndex, unitEntries.length - 1));
      const unit = unitEntries[index]?.unit;
      if (!unit) return;
      scheduler.cancelStale(unit.id);
      scheduleFromPosition(index);
    },
    cancel,
    dispose,
    completion,
    waitForCompletion: () => completion,
    getProgress: () => manifestProgress(manifest),
    getStats: () => scheduler.stats(),
    getReadyUnits: () => getUnitsByStatus(manifest, UnitStatus.READY),
    getFailedUnits,
  };
}

// --- Epub progressive import ---


export async function progressiveEpubImport(file, onProgress, options = {}) {
  const { signal } = options;
  mark("import-selected");
  await validateBookFile(file);

  const { default: JSZip } = await import("jszip");
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("This EPUB is damaged or cannot be opened.");
  }

  const archiveEntries = Object.values(zip.files);
  if (archiveEntries.length > MAX_ARCHIVE_ENTRIES) {
    throw new Error("This EPUB contains too many files to open safely.");
  }
  const oversizedEntry = archiveEntries.find(
    (entry) => !entry.dir && typeof entry._data?.uncompressedSize === "number" && entry._data.uncompressedSize > MAX_ENTRY_BYTES,
  );
  if (oversizedEntry) {
    throw new Error("This EPUB contains a file that is too large to open safely.");
  }

  const containerSource = await zip.file("META-INF/container.xml")?.async("text");
  if (!containerSource) {
    throw new Error("This archive does not appear to be a valid EPUB book. Its EPUB container manifest is missing.");
  }

  const container = parseXml(containerSource);
  const rootfile = xmlElements(container, "rootfile")[0]?.getAttribute("full-path");
  if (!rootfile) throw new Error("This EPUB does not identify its book package.");

  const packageSource = await zip.file(rootfile)?.async("text");
  if (!packageSource) throw new Error("This EPUB package could not be read.");
  const packageDoc = parseXml(packageSource);
  const manifestMap = new Map(
    xmlElements(packageDoc, "item").map((item) => [
      item.getAttribute("id"),
      item.getAttribute("href"),
    ]),
  );
  const spine = xmlElements(packageDoc, "itemref")
    .map((item) => item.getAttribute("idref"))
    .filter(Boolean);
  const metadata = xmlElements(packageDoc, "metadata")[0];
  const title = normalizeText(xmlElements(metadata ?? packageDoc, "title")[0]?.textContent) || cleanT(file.name);
  const author = normalizeText(xmlElements(metadata ?? packageDoc, "creator")[0]?.textContent);
  const documentId = `${file.name}:${file.size}:${file.lastModified}`;

  mark("validation-done");

  const manifest = createManifest({
    documentId,
    title,
    author,
    kind: "EPUB",
    totalUnits: spine.length,
  });

  // Add all spine items as units
  const unitEntries = [];
  for (let i = 0; i < spine.length; i++) {
    const unit = addUnit(manifest, {
      label: `Chapter ${i + 1}`,
      sourcePage: i,
      kind: "EPUB_SPINE",
    });
    unitEntries.push({ unit, spineIndex: i });
  }

  onProgress?.({ manifest, phase: "manifest-ready" });

  // For EPUB, parse all spine items (they're small and fast)
  let totalTextBytes = 0;
  for (const { unit, spineIndex } of unitEntries) {
    if (signal?.aborted) break;
    if (unit.status !== UnitStatus.UNSEEN) continue;

    const failUnit = (message) => {
      markUnitFailed(unit, new Error(message));
      onProgress?.({ manifest, phase: "unit-failed", unit, progress: manifestProgress(manifest) });
    };

    const href = manifestMap.get(spine[spineIndex]);
    if (!href) {
      failUnit("This EPUB chapter is missing from the archive and was skipped.");
      continue;
    }
    const archivePath = resolveArchivePath(rootfile, href.split("#")[0]);
    const source = await zip.file(archivePath)?.async("text");
    if (!source) {
      failUnit("This EPUB chapter could not be read and was skipped.");
      continue;
    }
    if (source.length > MAX_ENTRY_BYTES) {
      failUnit("This EPUB chapter is too large to open safely and was skipped.");
      continue;
    }
    totalTextBytes += source.length;
    if (totalTextBytes > MAX_TOTAL_TEXT_BYTES) {
      throw new Error("This EPUB contains more text than Bookflow can open safely (50 MB limit).");
    }

    const chapterDoc = parseXml(source, "application/xhtml+xml");
    const body = chapterDoc.body ?? chapterDoc.documentElement;
    const blocks = collectContentBlocks(body);
    if (!blocks.some((b) => b.type === "content") && !blocks.some((b) => b.type === "heading")) {
      blocks.push(...splitParagraphs(body.textContent).map((t) => ({ type: "content", text: t })));
    }
    const structured = buildEpubSections(blocks);
    const fallbackTitle = normalizeText(chapterDoc.querySelector("title")?.textContent);
    const chapter = chapterFromSections(
      structured.title || fallbackTitle || `Chapter ${spineIndex + 1}`,
      structured.sections,
    );

    if (chapter.paragraphs.length || chapter.subheadings?.length) {
      markUnitReady(unit, {
        text: chapter.paragraphs.join("\n"),
        paragraphs: chapter.paragraphs,
        ocrStatus: "native",
      });
      onProgress?.({ manifest, phase: "unit-ready", unit, progress: manifestProgress(manifest) });
    } else {
      failUnit("This EPUB chapter has no readable text and was skipped.");
    }
  }

  return {
    manifest,
    firstUnit: getFirstReadyUnit(manifest),
    cancel: () => {},
    dispose: () => {},
    getProgress: () => manifestProgress(manifest),
    getStats: () => ({ active: 0, queued: 0, maxConcurrency: 0, total: 0 }),
    getReadyUnits: () => getUnitsByStatus(manifest, UnitStatus.READY),
  };
}

// --- Text/Markdown progressive import ---

export async function progressiveTextImport(file, onProgress) {
  mark("import-selected");
  await validateBookFile(file);
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Please choose a file smaller than 50 MB.");
  }
  const source = await file.text();
  mark("validation-done");

  const result = parseTextDocument(file, source);

  if (!result.chapters.length) {
    throw new Error("No readable text was found in this document.");
  }

  const documentId = `${file.name}:${file.size}:${file.lastModified}`;
  const manifest = createManifest({
    documentId,
    title: result.title,
    author: result.author,
    kind: result.kind,
    totalUnits: result.chapters.length,
  });

  for (const chapter of result.chapters) {
    addUnit(manifest, {
      label: chapter.title,
      kind: "TEXT_SECTION",
      text: chapter.paragraphs.join("\n"),
      paragraphs: chapter.paragraphs,
    });
  }

  mark("chapters-done");
  onProgress?.({ manifest, phase: "manifest-ready", progress: 100 });

  return {
    manifest,
    firstUnit: getFirstReadyUnit(manifest),
    cancel: () => {},
    dispose: () => {},
    getProgress: () => 100,
    getStats: () => ({ active: 0, queued: 0, maxConcurrency: 0, total: 0 }),
    getReadyUnits: () => getUnitsByStatus(manifest, UnitStatus.READY),
  };
}

export { UnitStatus } from "./documentManifest.js";
