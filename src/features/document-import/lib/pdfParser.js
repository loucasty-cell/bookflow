import { normalizeText, splitParagraphs } from "../../../shared/lib/text.js";
import { cleanTitle } from "./textParser.js";
import {
  createPdfOcrScheduler,
  pageNeedsOcr,
  recognizePdfPage,
} from "./pdfOcr.js";

async function loadPdfDocument(file) {
  const [pdfjs] = await Promise.all([import("pdfjs-dist")]);
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  try {
    return await pdfjs.getDocument({ data }).promise;
  } catch {
    throw new Error("This PDF is encrypted, damaged, or cannot be read.");
  }
}

async function extractNativeText(pdf, documentTitle, startTime, reportProgress) {
  const pagesData = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const estRemainingSec = Math.max(1, Math.ceil((elapsedSec / Math.max(1, pageNumber)) * (pdf.numPages - pageNumber)));
    const pass1Progress = Math.max(2, Math.min(25, Math.round((pageNumber / pdf.numPages) * 25)));

    reportProgress(
      pass1Progress,
      `Reading page ${pageNumber} of ${pdf.numPages} (~${estRemainingSec}s remaining)`,
      "Inspecting native text and document structure"
    );

    const page = await pdf.getPage(pageNumber);
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

    const readableLines = lines.filter(
      (candidate) =>
        !(pageNumber === 1 && normalizeText(candidate) === documentTitle),
    );
    const nativeText = readableLines.join("\n");
    const requiresOcr = pageNeedsOcr(nativeText);

    pagesData.push({
      pageNumber,
      page,
      readableLines,
      requiresOcr,
      paragraphs: null,
    });
  }
  return pagesData;
}

async function performLocalOcr(pagesNeedingOcr, totalPagesForOcr, pdfNumPages, reportProgress) {
  reportProgress(
    26,
    "Starting private on-device OCR...",
    `Processing ${totalPagesForOcr} scanned pages`
  );

  let ocrScheduler;
  try {
    ocrScheduler = await createPdfOcrScheduler(() => {});
  } catch {
    throw new Error(
      "Bookflow could not start local OCR in this browser. Check that Web Workers and WebAssembly are enabled, then try again."
    );
  }

  const ocrStartTime = Date.now();
  let completedOcr = 0;
  let ocrPageCount = 0;

  try {
    // Worker pool pattern for bounded concurrency
    const maxConcurrency = Math.min(8, navigator.hardwareConcurrency || 2);
    let currentIndex = 0;

    const processNext = async () => {
      while (currentIndex < pagesNeedingOcr.length) {
        const pageData = pagesNeedingOcr[currentIndex];
        currentIndex++;

    const page = await pdf.getPage(pageNumber);
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

    const readableLines = lines.filter(
      (candidate) => !(pageNumber === 1 && normalizeText(candidate) === documentTitle)
    );
    const nativeText = readableLines.join("\n");
    const requiresOcr = pageNeedsOcr(nativeText);

    pagesData.push({
      pageNumber,
      page,
      readableLines,
      requiresOcr,
      paragraphs: null,
    });
  }
  return pagesData;
}

async function performLocalOcr(ocrScheduler, pagesData, pdfNumPages, reportProgress) {
  let ocrPageCount = 0;

  const pagesNeedingOcr = pagesData.filter(p => p.requiresOcr);
  const totalPagesForOcr = pagesNeedingOcr.length;

  if (totalPagesForOcr > 0) {
    reportProgress(
      26,
      "Starting private on-device OCR...",
      `Processing ${totalPagesForOcr} scanned pages`
    );

    const ocrStartTime = Date.now();
    let completedOcr = 0;

    // Use a bounded concurrency limit based on hardware to prevent massive memory usage
    // limit is set to max of 4 matching the ocr worker limit to avoid canvas thrashing
    const workerCount = Math.min(4, navigator.hardwareConcurrency || 2);

    // Create a pool of workers that process the queue concurrently
    const queue = [...pagesNeedingOcr];

    const workerPool = Array(workerCount).fill(null).map(async () => {
      while (queue.length > 0) {
        const pageData = queue.shift();
        if (!pageData) continue;

        const recognized = await recognizePdfPage(ocrScheduler, pageData.page);
        pageData.paragraphs = recognized.paragraphs;
        if (pageData.paragraphs.length) ocrPageCount += 1;

        completedOcr++;
        const ocrElapsedSec = (Date.now() - ocrStartTime) / 1000;
        const estOcrRemainingSec = Math.max(1, Math.ceil((ocrElapsedSec / completedOcr) * (totalPagesForOcr - completedOcr)));
        const ocrProgress = Math.min(92, Math.round(26 + (completedOcr / totalPagesForOcr) * 66));

        reportProgress(
          ocrProgress,
          `Recovered scanned page ${pageData.pageNumber} of ${pdfNumPages} (${completedOcr}/${totalPagesForOcr}) ~${estOcrRemainingSec}s remaining`,
          "Private local OCR processing in parallel chunks"
        );
      }
    };

    const workers = [];
    for (let i = 0; i < maxConcurrency; i++) {
      workers.push(processNext());
    }

    await Promise.all(workers);
  } finally {
    await ocrScheduler.terminate().catch(() => undefined);
  }

  return ocrPageCount;
}

function assembleChapters(pagesData, reportProgress) {
  reportProgress(94, "Formatting paragraphs and sentences...", "Almost ready");
  const chapters = [];

  for (const pageData of pagesData) {
    if (!pageData.requiresOcr) {
      const pageText = pageData.readableLines
        .map((line, index) => {
          const next = pageData.readableLines[index + 1] || "";
          const headingLike =
            line.length < 90 &&
            !/[.!?…]["'’”)]?$/.test(line) &&
            /^[A-Z\d]/.test(line);
          const paragraphEnd =
            /[.!?…]["'’”)]?$/.test(line) &&
            (!next || /^[A-Z\d“"'’]/.test(next));
          return `${line}${headingLike || paragraphEnd ? "\n\n" : " "}`;
        })
        .join("")
        .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
        .replace(/\n(?=\p{Ll})/gu, " ");
      pageData.paragraphs = splitParagraphs(pageText).filter(
        (paragraph) => paragraph.length > 15,
      );
    }

    const pageTitleCandidate = normalizeText(
      pageData.paragraphs?.[0] ?? pageData.readableLines[0] ?? "",
    );
    const pageTitle =
      pageTitleCandidate &&
      pageTitleCandidate.length <= 62 &&
      !/[.!?…]["'’”)]?$/.test(pageTitleCandidate) &&
      /^[A-Z\d]/.test(pageTitleCandidate)
        ? pageTitleCandidate
        : `Page ${pageData.pageNumber}`;

    if (pageData.paragraphs?.length) {
      chapters.push({ title: pageTitle, paragraphs: pageData.paragraphs });
    }
  }

  return chapters;
}

export async function parsePdf(file, onProgress) {
  const startTime = Date.now();

  let lastProgress = 1;
  const reportProgress = (percent, label, detail) => {
    lastProgress = Math.max(lastProgress, Math.min(99, Math.round(percent)));
    onProgress?.(lastProgress, label, detail);
  };

  reportProgress(1, "Initializing PDF document...", "Reading local file bytes");

  const pdf = await loadPdfDocument(file);
  const metadata = await pdf.getMetadata().catch(() => null);
  const documentTitle = normalizeText(metadata?.info?.Title) || cleanTitle(file.name);

  // Pass 1: Extract native text and determine which pages need OCR
  const pagesData = await extractNativeText(pdf, documentTitle, startTime, reportProgress);

  const pagesNeedingOcr = pagesData.filter((p) => p.requiresOcr);
  const totalPagesForOcr = pagesNeedingOcr.length;
  let ocrPageCount = 0;

  // Pass 2: Initialize OCR Scheduler if needed, and run OCR concurrently
  if (totalPagesForOcr > 0) {
    ocrPageCount = await performLocalOcr(pagesNeedingOcr, totalPagesForOcr, pdf.numPages, reportProgress);
  } else {
    reportProgress(85, "Structuring chapters and sections...", "Preparing native text layout");
  }

  // Pass 3: Assemble Chapters in order
  const chapters = assembleChapters(pagesData, reportProgress);

          "Private local OCR processing in parallel"
        );
      }
    });

    await Promise.all(workerPool);

  } else {
    reportProgress(85, "Structuring chapters and sections...", "Preparing native text layout");
  }

  return { ocrPageCount };
}

function assembleChapters(pagesData) {
  const chapters = [];
  for (const pageData of pagesData) {
    if (!pageData.requiresOcr) {
      const pageText = pageData.readableLines
        .map((line, index) => {
          const next = pageData.readableLines[index + 1] || "";
          const headingLike =
            line.length < 90 &&
            !/[.!?…]["'’”)]?$/.test(line) &&
            /^[A-Z\d]/.test(line);
          const paragraphEnd =
            /[.!?…]["'’”)]?$/.test(line) &&
            (!next || /^[A-Z\d“"'’]/.test(next));
          return `${line}${headingLike || paragraphEnd ? "\n\n" : " "}`;
        })
        .join("")
        .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
        .replace(/\n(?=\p{Ll})/gu, " ");
      pageData.paragraphs = splitParagraphs(pageText).filter(
        (paragraph) => paragraph.length > 15
      );
    }

    const pageTitleCandidate = normalizeText(
      pageData.paragraphs?.[0] ?? pageData.readableLines[0] ?? ""
    );
    const pageTitle =
      pageTitleCandidate &&
      pageTitleCandidate.length <= 62 &&
      !/[.!?…]["'’”)]?$/.test(pageTitleCandidate) &&
      /^[A-Z\d]/.test(pageTitleCandidate)
        ? pageTitleCandidate
        : `Page ${pageData.pageNumber}`;

    if (pageData.paragraphs?.length) chapters.push({ title: pageTitle, paragraphs: pageData.paragraphs });
  }
  return chapters;
}

export async function parsePdf(file, onProgress) {
  const startTime = Date.now();

  let lastProgress = 1;
  const reportProgress = (percent, label, detail) => {
    lastProgress = Math.max(lastProgress, Math.min(99, Math.round(percent)));
    onProgress?.(lastProgress, label, detail);
  };

  reportProgress(1, "Initializing PDF document...", "Reading local file bytes");

  const pdf = await loadPdfDocument(file);
  const metadata = await pdf.getMetadata().catch(() => null);
  const documentTitle = normalizeText(metadata?.info?.Title) || cleanTitle(file.name);
  let ocrScheduler = null;
  let ocrPageCount = 0;
  let chapters = [];

  try {
    const pagesData = await extractNativeText(pdf, documentTitle, startTime, reportProgress);

    const needsOcr = pagesData.some((p) => p.requiresOcr);
    if (needsOcr) {
      try {
        ocrScheduler = await createPdfOcrScheduler(() => {});
      } catch {
        throw new Error(
          "Bookflow could not start local OCR in this browser. Check that Web Workers and WebAssembly are enabled, then try again."
        );
      }
    }

    const ocrResult = await performLocalOcr(ocrScheduler, pagesData, pdf.numPages, reportProgress);
    ocrPageCount = ocrResult.ocrPageCount;

    reportProgress(94, "Formatting paragraphs and sentences...", "Almost ready");
    chapters = assembleChapters(pagesData);

  } finally {
    await ocrScheduler?.terminate().catch(() => undefined);
  }

  if (!chapters.length) {
    throw new Error(
      "Local OCR could not find readable English text in this PDF. Try a clearer, upright scan or an OCR-ready copy."
    );
  }

  return {
    title: documentTitle,
    author: normalizeText(metadata?.info?.Author),
    kind: "PDF",
    chapters,
    ocrPageCount,
  };
}
