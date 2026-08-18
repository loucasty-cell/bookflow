import { normalizeText, splitParagraphs } from "../../../shared/lib/text.js";
import { cleanTitle } from "./textParser.js";
import {
  createPdfOcrScheduler,
  pageNeedsOcr,
  pdfPageProgress,
  recognizePdfPage,
} from "./pdfOcr.js";

export async function parsePdf(file, onProgress) {
  const [pdfjs, workerModule] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const data = new Uint8Array(await file.arrayBuffer());
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data }).promise;
  } catch {
    throw new Error("This PDF is encrypted, damaged, or cannot be read.");
  }

  const metadata = await pdf.getMetadata().catch(() => null);
  const chapters = [];
  const documentTitle =
    normalizeText(metadata?.info?.Title) || cleanTitle(file.name);
  let ocrScheduler = null;
  let ocrPageCount = 0;
  let lastProgress = 10;

  const reportProgress = (percent, label) => {
    lastProgress = Math.max(lastProgress, Math.min(96, Math.round(percent)));
    onProgress?.(lastProgress, label);
  };

  let totalPagesForOcr = 0;

  const ocrLogger = () => {
    // Progress tracking across workers is handled via completed pages below
  };

  const pagesData = [];

  try {
    // Pass 1: Extract native text and determine which pages need OCR
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      // Intentionally don't update progress here to keep it monotonic during Pass 2
      // Just notify we are analyzing structure quickly.
      onProgress?.(lastProgress, `Reading page ${pageNumber} of ${pdf.numPages}`);

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

    const pagesNeedingOcr = pagesData.filter(p => p.requiresOcr);
    totalPagesForOcr = pagesNeedingOcr.length;

    // Pass 2: Initialize OCR Scheduler if needed, and run OCR concurrently
    if (totalPagesForOcr > 0) {
      reportProgress(
        pdfPageProgress(1, pdf.numPages, 0.04),
        "Starting private on-device OCR",
      );
      try {
        ocrScheduler = await createPdfOcrScheduler(ocrLogger);
      } catch {
        throw new Error(
          "Bookflow could not start local OCR in this browser. Check that Web Workers and WebAssembly are enabled, then try again.",
        );
      }

      let completedOcr = 0;
      await Promise.all(pagesNeedingOcr.map(async (pageData) => {
        const recognized = await recognizePdfPage(ocrScheduler, pageData.page);
        pageData.paragraphs = recognized.paragraphs;
        if (pageData.paragraphs.length) ocrPageCount += 1;

        completedOcr++;
        reportProgress(
          pdfPageProgress(pageData.pageNumber, pdf.numPages, 1),
          `Recovered scanned page ${pageData.pageNumber} of ${pdf.numPages} (${completedOcr}/${totalPagesForOcr})`
        );
      }));
    }

    // Pass 3: Assemble Chapters in order
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

  } finally {
    await ocrScheduler?.terminate().catch(() => undefined);
  }

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
