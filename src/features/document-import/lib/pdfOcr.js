import {
  normalizeText,
  splitParagraphs,
  wordCount,
} from "../../../shared/lib/text.js";

const OCR_RENDER_SCALE = 2.5;
const OCR_MAX_PIXELS = 10_000_000;
const NATIVE_TEXT_MIN_CHARACTERS = 80;
const NATIVE_TEXT_MIN_WORDS = 12;

export function pageNeedsOcr(text) {
  const normalized = normalizeText(text);
  return (
    normalized.length < NATIVE_TEXT_MIN_CHARACTERS ||
    wordCount(normalized) < NATIVE_TEXT_MIN_WORDS
  );
}

export function ocrTextToParagraphs(text) {
  const prepared = String(text ?? "")
    .replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, "$1$2")
    .replace(/^\s*\d+\s*$/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");

  return splitParagraphs(prepared).filter(
    (paragraph) => wordCount(paragraph) >= 3 && paragraph.length > 15,
  );
}

export function pdfPageProgress(pageNumber, totalPages, pageProgress = 1) {
  const start = 12;
  const range = 84;
  const pageShare = range / Math.max(1, totalPages);
  return Math.min(
    96,
    Math.round(start + (pageNumber - 1) * pageShare + pageProgress * pageShare),
  );
}

export function renderScaleForDimensions(width, height) {
  const pixelLimitedScale = Math.sqrt(
    OCR_MAX_PIXELS / Math.max(1, width * height),
  );
  return Math.min(OCR_RENDER_SCALE, pixelLimitedScale);
}

export function ocrDpiForScale(scale) {
  return Math.round(Math.max(144, Math.min(300, scale * 72)));
}

function localOcrUrl(path) {
  return new URL(`${import.meta.env.BASE_URL}ocr/${path}`, document.baseURI).href;
}

export async function createPdfOcrScheduler(reportProgress) {
  const { createWorker, createScheduler } = await import("tesseract.js");
  const scheduler = createScheduler();
  const workerCount = Math.min(4, navigator.hardwareConcurrency || 2);

  for (let i = 0; i < workerCount; i++) {
    const worker = await createWorker("eng", 1, {
      workerPath: localOcrUrl("worker.min.js"),
      corePath: localOcrUrl("core"),
      langPath: localOcrUrl("lang"),
      logger: (message) => reportProgress?.(message),
    });
    scheduler.addWorker(worker);
  }

  return scheduler;
}

function renderScaleForPage(page) {
  const baseViewport = page.getViewport({ scale: 1 });
  return renderScaleForDimensions(baseViewport.width, baseViewport.height);
}

function normalizeScanContrast(context, width, height) {
  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;
  let lightest = 0;
  let darkest = 255;

  for (let index = 0; index < pixels.length; index += 16) {
    const luminance = Math.round(
      pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722,
    );
    lightest = Math.max(lightest, luminance);
    darkest = Math.min(darkest, luminance);
  }

  const range = lightest - darkest;
  if (range < 24 || range > 150) return;

  const contrast = Math.min(2, 210 / range);
  const midpoint = (lightest + darkest) / 2;
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = Math.round(
      pixels[index] * 0.2126 +
        pixels[index + 1] * 0.7152 +
        pixels[index + 2] * 0.0722,
    );
    const adjusted = Math.max(
      0,
      Math.min(255, Math.round((luminance - midpoint) * contrast + 127)),
    );
    pixels[index] = adjusted;
    pixels[index + 1] = adjusted;
    pixels[index + 2] = adjusted;
  }
  context.putImageData(image, 0, 0);
}

export async function renderPdfPageForOcr(page) {
  const scale = renderScaleForPage(page);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const canvasContext = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });
  if (!canvasContext)
    throw new Error("This browser could not prepare a scanned PDF page for OCR.");

  await page.render({
    canvasContext,
    viewport,
    background: "#ffffff",
  }).promise;
  normalizeScanContrast(canvasContext, canvas.width, canvas.height);
  return { canvas, dpi: ocrDpiForScale(scale) };
}

export async function recognizePdfPage(scheduler, page) {
  const { canvas, dpi } = await renderPdfPageForOcr(page);
  try {
    const result = await scheduler.addJob('recognize', canvas, {
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: "3",
      user_defined_dpi: String(dpi),
    });
    return {
      confidence: Number(result.data.confidence) || 0,
      paragraphs: ocrTextToParagraphs(result.data.text),
    };
  } finally {
    canvas.width = 1;
    canvas.height = 1;
  }
}
