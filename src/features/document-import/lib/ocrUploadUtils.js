export function isPdfFile(file) {
  if (!file) return false;
  if (typeof file.name === 'string' && /\.pdf$/i.test(file.name)) return true;
  return file.type === 'application/pdf' || file.type === 'application/x-pdf';
}

export function baseName(name, fallback) {
  if (typeof name !== 'string' || !name) return fallback;
  return name.replace(/\.pdf$/i, '');
}

export function createOcrProgress(percent = 0) {
  return {
    currentPage: 0,
    totalPages: 0,
    percent,
    totalWords: 0,
    pagesPerSecond: 0,
    elapsedSeconds: 0,
  };
}

export function buildOcrMarkdown(pages) {
  return pages
    .map((page) => `<!-- Page ${page.page_number} -->\n\n${page.text}`)
    .join('\n\n---\n\n');
}
