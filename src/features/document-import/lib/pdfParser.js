import { normalizeText, splitParagraphs } from "../../../shared/lib/text.js";
import { cleanTitle } from "./textParser.js";
import {
  createPdfOcrScheduler,
  pageNeedsOcr,
  recognizePdfPage,
} from "./pdfOcr.js";

async function extractNativeTextAndCheckOcr(pdf, documentTitle, startTime, reportProgress) {
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

async function processOcrPages(pagesData, pdfNumPages, reportProgress) {
  const pagesNeedingOcr = pagesData.filter(p => p.requiresOcr);
  const totalPagesForOcr = pagesNeedingOcr.length;
  let ocrPageCount = 0;
  let ocrScheduler = null;

  if (totalPagesForOcr > 0) {
    reportProgress(
      26,
      "Starting private on-device OCR...",
      `Processing ${totalPagesForOcr} scanned pages`
    );
    try {
      ocrScheduler = await createPdfOcrScheduler(() => {});
    } catch {
      throw new Error(
        "Bookflow could not start local OCR in this browser. Check that Web Workers and WebAssembly are enabled, then try again.",
      );
    }

    const ocrStartTime = Date.now();
    let completedOcr = 0;
    try {
      await Promise.all(pagesNeedingOcr.map(async (pageData) => {
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
          "Private local OCR processing in parallel"
        );
      }));
    } finally {
      await ocrScheduler?.terminate().catch(() => undefined);
    }
  } else {
    reportProgress(85, "Structuring chapters and sections...", "Preparing native text layout");
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

    if (pageData.paragraphs?.length) chapters.push({ title: pageTitle, paragraphs: pageData.paragraphs });
  }
  return chapters;
}

export async function parsePdf(file, onProgress) {
  const startTime = Date.now();
  onProgress?.(1, "Initializing PDF document...", "Reading local file bytes");

  const [pdfjs] = await Promise.all([
    import("pdfjs-dist"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data }).promise;
  } catch {
    throw new Error("This PDF is encrypted, damaged, or cannot be read.");
  }

  const metadata = await pdf.getMetadata().catch(() => null);
  const documentTitle = normalizeText(metadata?.info?.Title) || cleanTitle(file.name);

  let lastProgress = 1;
  const reportProgress = (percent, label, detail) => {
    lastProgress = Math.max(lastProgress, Math.min(99, Math.round(percent)));
    onProgress?.(lastProgress, label, detail);
  };

  const pagesData = await extractNativeTextAndCheckOcr(pdf, documentTitle, startTime, reportProgress);
  const ocrPageCount = await processOcrPages(pagesData, pdf.numPages, reportProgress);
  const chapters = assembleChapters(pagesData, reportProgress);

  if (!chapters.length)
    throw new Error(
      "Local OCR could not find readable English text in this PDF. Try a clearer, upright scan or an OCR-ready copy.",
    );

  return {
    title: documentTitle,
    author: normalizeText(metadata?.info?.Author),
    kind: "PDF",
    chapters,
    ocrPageCount,
  };
}
