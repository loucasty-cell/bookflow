function pageNumber(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function pageText(page) {
  return typeof page?.text === "string" ? page.text : "";
}

function isReadablePage(page) {
  return page && page.success !== false && pageText(page).trim().length > 0;
}

export function normalizeOcrPages(pages) {
  if (!Array.isArray(pages)) return [];

  const readable = new Map();
  pages.forEach((page, index) => {
    if (!isReadablePage(page)) return;
    const fallback = index + 1;
    const number = pageNumber(page.page_number, fallback);
    const existing = readable.get(number);
    if (!existing) {
      readable.set(number, { page: { ...page, page_number: number }, index });
    }
  });

  return [...readable.values()]
    .sort((first, second) => first.page.page_number - second.page.page_number || first.index - second.index)
    .map(({ page }) => page);
}

export function getOcrSkippedPages(pages, reportedPages = []) {
  const rawPages = Array.isArray(pages) ? pages : [];
  const readableNumbers = new Set(normalizeOcrPages(rawPages).map((page) => page.page_number));
  const skipped = new Set();

  rawPages.forEach((page, index) => {
    if (!page || isReadablePage(page)) return;
    const number = pageNumber(page.page_number, index + 1);
    if (!readableNumbers.has(number)) skipped.add(number);
  });

  if (Array.isArray(reportedPages)) {
    reportedPages.forEach((value) => {
      const number = Number(value);
      if (Number.isInteger(number) && number > 0 && !readableNumbers.has(number)) {
        skipped.add(number);
      }
    });
  }

  return [...skipped].sort((first, second) => first - second);
}

export function ocrResultToBook(ocrResult) {
  if (!ocrResult || !Array.isArray(ocrResult.pages) || ocrResult.pages.length === 0) return null;

  const pages = normalizeOcrPages(ocrResult.pages);
  if (pages.length === 0) return null;

  const docChapters = pages.map((page) => {
    const pageNumberValue = page.page_number;
    const rawText = pageText(page);
    const lines = rawText
      .split(/\n\s*\n|\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let title = `Page ${pageNumberValue}`;
    const heading = lines[0]?.match(/^#+\s+(.+)$/);
    if (heading?.[1]?.trim()) title = heading[1].trim();

    return {
      title,
      paragraphs: lines,
    };
  });

  const reportedTotalWords = Number(ocrResult.totalWords ?? ocrResult.total_words);
  const totalWords = Number.isFinite(reportedTotalWords)
    ? Math.max(0, reportedTotalWords)
    : pages.reduce((total, page) => {
      const pageWords = Number(page.word_count);
      if (Number.isFinite(pageWords) && pageWords >= 0) return total + pageWords;
      return total + pageText(page).trim().split(/\s+/).filter(Boolean).length;
    }, 0);

  return {
    title: ocrResult.title || "OCR Document",
    author: "Hugging Face OCR",
    kind: "PDF",
    chapters: docChapters,
    ocrPageCount: pages.length,
    totalWords,
    skippedPages: getOcrSkippedPages(ocrResult.pages, ocrResult.failedPages ?? ocrResult.failed_pages),
  };
}
