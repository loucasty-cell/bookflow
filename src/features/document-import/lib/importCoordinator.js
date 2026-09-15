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
} from "./documentManifest.js";
import { createImportScheduler } from "./importScheduler.js";
import { mark } from "../../../shared/lib/perfMarks.js";
import {
  normalizeText,
  splitParagraphs,
} from "../../../shared/lib/text.js";
import { pageNeedsOcr, createPdfOcrScheduler, recognizePdfPage } from "./pdfOcr.js";
import { openPdfDocument } from "./pdfDocument.js";
import {
  parseXml,
  xmlElements,
  resolveArchivePath,
  collectContentBlocks,
  buildEpubSections,
  chapterFromSections,
} from "./epubUtils.js";
import { cleanTitle as cleanT, parseTextDocument } from "./textParser.js";
import { markReady as markUnitReady } from "./documentManifest.js";

// --- PDF progressive import ---

export async function progressivePdfImport(file, onProgress) {
  mark("import-selected");

  const [pdfjs] = await Promise.all([import("pdfjs-dist")]);

  const data = new Uint8Array(await file.arrayBuffer());
  let pdf;
  try {
    pdf = await openPdfDocument(pdfjs, data);
  } catch {
    throw new Error(
      "This PDF looks damaged, but the accelerated backend scan may still read it.",
    );
  }

  const metadata = await pdf.getMetadata().catch(() => null);
  const documentTitle = normalizeText(metadata?.info?.Title) || cleanTitleFallback(file.name);
  const documentId = `${file.name}:${file.size}:${file.lastModified}`;

  mark("validation-done");

  // Create manifest with one unit per PDF page
  const manifest = createManifest({
    documentId,
    title: documentTitle,
    author: normalizeText(metadata?.info?.Author),
    kind: "PDF",
    totalUnits: pdf.numPages,
  });

  // Add all units as UNSEEN
  const unitEntries = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const unit = addUnit(manifest, {
      label: `Page ${i}`,
      sourcePage: i,
      kind: "PDF_PAGE",
    });
    unitEntries.push({ unit, pageNumber: i });
  }

  onProgress?.({ manifest, phase: "manifest-ready" });

  // Create scheduler
  let firstReadyResolve = null;
  let firstReadyReject = null;
  const firstReadyPromise = new Promise((resolve, reject) => {
    firstReadyResolve = resolve;
    firstReadyReject = reject;
  });

  let readyCount = 0;
  let failedCount = 0;
  const totalUnits = unitEntries.length;
  let _userPositionIndex = 0; // tracks user's current reading position for stale cancellation
  let sharedOcrScheduler = null;
  let sharedOcrReady = null;

  const getSharedOcrScheduler = () => {
    if (!sharedOcrReady) {
      sharedOcrReady = createPdfOcrScheduler(() => {}).then((s) => {
        sharedOcrScheduler = s;
        return s;
      });
    }
    return sharedOcrReady;
  };

  const scheduler = createImportScheduler({
    onUnitReady: (unit) => {
      readyCount += 1;
      onProgress?.({ manifest, phase: "unit-ready", unit, progress: manifestProgress(manifest) });
      if (readyCount === 1 && firstReadyResolve) {
        firstReadyResolve(unit);
        firstReadyResolve = null;
        firstReadyReject = null;
      }
    },
    onUnitFailed: (unit) => {
      failedCount += 1;
      onProgress?.({ manifest, phase: "unit-failed", unit, progress: manifestProgress(manifest) });
      if (readyCount === 0 && failedCount >= totalUnits && firstReadyReject) {
        firstReadyReject(
          new Error("Local OCR could not find readable English text in this PDF. Try a clearer, upright scan or an OCR-ready copy."),
        );
        firstReadyResolve = null;
        firstReadyReject = null;
      }
    },
    onProgress: () => {
      onProgress?.({ manifest, phase: "scheduler-tick", progress: manifestProgress(manifest) });
    },
  });

  // Schedule units: current + next 2 immediately, rest as BACKGROUND
  const scheduleFromPosition = (startIndex) => {
    for (let i = startIndex; i < unitEntries.length; i++) {
      const { unit } = unitEntries[i];
      if (unit.status !== UnitStatus.UNSEEN) continue;

      const dist = i - startIndex;
      let priority;
      if (dist === 0) priority = 0; // CURRENT
      else if (dist <= 2) priority = 1; // NEXT
      else priority = 3; // BACKGROUND

      scheduler.enqueue(unit, priority, async (u, abortSignal) => {
        const page = await pdf.getPage(u.sourcePage);
        if (abortSignal.aborted) { page.cleanup(); return; }

        // Try native text first
        const content = await page.getTextContent({ normalizeWhitespace: true });
        const lines = [];
        let currentLine = [];
        let lastY = null;

        for (const item of content.items) {
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
        const needsOcr = pageNeedsOcr(nativeText);

        if (!needsOcr) {
          // Native text is usable
          const cleaned = lines
            .filter((l) => !(u.sourcePage === 1 && normalizeText(l) === documentTitle))
            .join("\n");
          const paragraphs = splitParagraphs(cleaned).filter((p) => p.length > 15);
          page.cleanup();
          return {
            text: cleaned,
            paragraphs,
            confidence: null,
            ocrStatus: "native",
          };
        }

        // Needs OCR — run Tesseract via shared scheduler
        try {
          const tessScheduler = await getSharedOcrScheduler();

          if (abortSignal.aborted) {
            return;
          }

          const recognized = await recognizePdfPage(tessScheduler, page);
          page.cleanup();

          return {
            text: recognized.paragraphs.join("\n"),
            paragraphs: recognized.paragraphs,
            confidence: recognized.confidence,
            ocrStatus: "ocr-ready",
          };
        } catch (err) {
          page.cleanup();
          throw err;
        }
      });
    }
  };

  // Start scheduling from position 0
  scheduleFromPosition(0);

  // Wait for first ready unit
  const firstUnit = await firstReadyPromise;

  // Cancel stale background work if user jumps far
  const jumpToUnit = (unitIndex) => {
    _userPositionIndex = unitIndex;
    const { unit } = unitEntries[unitIndex] || {};
    if (unit) {
      scheduler.cancelStale(unit.id);
      // Schedule next 2 from new position
      scheduleFromPosition(unitIndex);
    }
  };

  const cancel = () => {
    scheduler.cancelAll();
    if (sharedOcrScheduler) {
      sharedOcrScheduler.terminate().catch(() => undefined);
      sharedOcrScheduler = null;
      sharedOcrReady = null;
    }
  };

  const dispose = () => {
    scheduler.cancelAll();
    if (sharedOcrScheduler) {
      sharedOcrScheduler.terminate().catch(() => undefined);
      sharedOcrScheduler = null;
      sharedOcrReady = null;
    }
  };

  return {
    manifest,
    firstUnit,
    scheduler,
    jumpToUnit,
    cancel,
    dispose,
    getProgress: () => manifestProgress(manifest),
    getStats: () => scheduler.stats(),
    getReadyUnits: () => getUnitsByStatus(manifest, UnitStatus.READY),
  };
}

// --- Epub progressive import ---

export async function progressiveEpubImport(file, onProgress, options = {}) {
  const { signal } = options;
  mark("import-selected");

  const { default: JSZip } = await import("jszip");
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("This EPUB is damaged or cannot be opened.");
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
  for (const { unit, spineIndex } of unitEntries) {
    if (signal?.aborted) break;
    if (unit.status !== UnitStatus.UNSEEN) continue;

    const href = manifestMap.get(spine[spineIndex]);
    if (!href) continue;
    const archivePath = resolveArchivePath(rootfile, href.split("#")[0]);
    const source = await zip.file(archivePath)?.async("text");
    if (!source) continue;

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
    }

    onProgress?.({ manifest, phase: "unit-ready", unit, progress: Math.round(((spineIndex + 1) / spine.length) * 100) });
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

// Fallback title cleaning (avoids circular dep on textParser)
function cleanTitleFallback(filename) {
  return String(filename)
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export { UnitStatus } from "./documentManifest.js";
