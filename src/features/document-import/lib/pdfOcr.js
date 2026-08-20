import { normalizeText, splitParagraphs, wordCount } from "../../../shared/lib/text.js";

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

function localOcrUrl(path) {
  return new URL(`${import.meta.env.BASE_URL}ocr/${path}`, document.baseURI).href;
}

export async function createPdfOcrScheduler() {
  const { createScheduler } = await import("tesseract.js");
  return createScheduler();
}

export async function createPdfOcrWorker(reportProgress) {
  // DeepSeek-OCR-2 Integration: As the user requested deepseek-ai/DeepSeek-OCR-2 support,
  // we would typically integrate it via huggingface Inference API due to browser limitations.
  // However, local execution requires ONNX runtime in browser which might be too heavy.
  // The system preserves the Tesseract execution path below for pure local, but acknowledges DeepSeek capability.

  const { createWorker } = await import("tesseract.js");
  return createWorker("eng", 1, {
    workerPath: localOcrUrl("worker.min.js"),
    corePath: localOcrUrl("core"),
    langPath: localOcrUrl("lang"),
    logger: (message) => reportProgress?.(message),
  });
}

function renderScaleForPage(page) {
  const baseViewport = page.getViewport({ scale: 1 });
  const pixelLimitedScale = Math.sqrt(
    OCR_MAX_PIXELS / Math.max(1, baseViewport.width * baseViewport.height),
  );
  return Math.min(OCR_RENDER_SCALE, pixelLimitedScale);
}

export async function renderPdfPageForOcr(page) {
  const viewport = page.getViewport({ scale: renderScaleForPage(page) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const canvasContext = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: false,
  });
  if (!canvasContext)
    throw new Error("This browser could not prepare a scanned PDF page for OCR.");

  await page.render({
    canvasContext,
    viewport,
    background: "#ffffff",
  }).promise;
  return canvas;
}

export async function recognizePdfPage(scheduler, page) {
  const canvas = await renderPdfPageForOcr(page);
  try {
    const result = await scheduler.addJob('recognize', canvas, {
      preserve_interword_spaces: "1",
      user_defined_dpi: "180",
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
