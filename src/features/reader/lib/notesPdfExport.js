import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { downloadBlob, notesFilename } from "./notesExport.js";

export { notesFilename, sanitizeFilename } from "./notesExport.js";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 42;
const MARGIN_RIGHT = 42;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 46;
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const CONTENT_FLOOR = MARGIN_BOTTOM;
const RUNNING_HEADER_BAND = 20;
const RUNNING_HEADER_BLOCK = 32;
const HEADER_BANNER_HEIGHT = 84;
const CARD_GAP = 12;
const CARD_PADDING_X = 14;
const CARD_PADDING_Y = 12;
const CARD_HEADER_BLOCK = 20;
const CARD_TAIL_GAP = 4;
const CARD_BOTTOM_RESERVE = CARD_PADDING_Y + CARD_TAIL_GAP;
const CONTINUATION_HEADER_BLOCK = 18;
const BODY_SIZE = 10.5;
const BODY_LINE_HEIGHT = 15;
const QUOTE_SIZE = 9.5;
const QUOTE_LINE_HEIGHT = 13.5;
const QUOTE_PAD = 8;
const QUOTE_INSET = 10;
const CARD_TEXT_WIDTH = USABLE_WIDTH - CARD_PADDING_X * 2;
const QUOTE_TEXT_WIDTH = CARD_TEXT_WIDTH - QUOTE_INSET - 3;
const FALLBACK_WIDTH_RATIO = 0.55;
const UNSUPPORTED_GLYPH = "?";
const YIELD_INTERVAL_MS = 12;
const YIELD_OP_INTERVAL = 240;

const COLOR_CARD_BG = [0.975, 0.982, 0.99];
const COLOR_CARD_BORDER = [0.85, 0.88, 0.92];
const COLOR_HEADER_BG = [0.95, 0.965, 0.98];
const COLOR_HEADER_BORDER = [0.84, 0.87, 0.92];
const COLOR_RUNNING_HEADER_BG = [0.97, 0.975, 0.985];
const COLOR_INK_PRIMARY = [0.08, 0.1, 0.14];
const COLOR_INK_BODY = [0.14, 0.16, 0.2];
const COLOR_INK_MUTED = [0.42, 0.46, 0.52];
const COLOR_CYAN = [0.02, 0.62, 0.75];
const COLOR_QUOTE_BG = [0.955, 0.95, 0.985];
const COLOR_QUOTE_BORDER = [0.55, 0.38, 0.95];
const COLOR_DOT_RED = [1, 0.37, 0.34];
const COLOR_DOT_YELLOW = [1, 0.74, 0.18];
const COLOR_DOT_GREEN = [0.16, 0.8, 0.28];

const MIN_ATOM_HEIGHT = Math.max(BODY_LINE_HEIGHT, QUOTE_LINE_HEIGHT);
const MIN_SEGMENT_BODY = MIN_ATOM_HEIGHT + 2;

const glyphSupportCache = new WeakMap();
const WINANSI_FALLBACK =
  /^[\u0020-\u007e\u00a0-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]$/;

/**
 * Formats timestamps into a clean human date string.
 */
function formatNoteDate(timestamp) {
  if (!timestamp) return "Recent session";
  try {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recent session";
  }
}

/**
 * Cooperative yield so large note sets do not lock the main thread.
 */
function yieldToHost() {
  const scheduler = globalThis.scheduler;
  if (scheduler && typeof scheduler.yield === "function") {
    return Promise.resolve(scheduler.yield()).then(
      () => undefined,
      () => new Promise((resolve) => setTimeout(resolve, 0))
    );
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Measures a string with the embedded font, falling back to an estimate when the
 * font refuses to encode the string.
 */
export function measureTextWidth(font, text, size) {
  const value = String(text ?? "");
  if (!value) return 0;
  try {
    return font.widthOfTextAtSize(value, size);
  } catch {
    return value.length * size * FALLBACK_WIDTH_RATIO;
  }
}

/**
 * True when the embedded font can encode a single character without throwing.
 */
function isEncodableGlyph(font, char) {
  if (typeof font?.encodeText !== "function") return WINANSI_FALLBACK.test(char);
  let cache = glyphSupportCache.get(font);
  if (!cache) {
    cache = new Map();
    glyphSupportCache.set(font, cache);
  }
  const cached = cache.get(char);
  if (cached !== undefined) return cached;
  let supported = true;
  try {
    font.encodeText(char);
  } catch {
    supported = false;
  }
  cache.set(char, supported);
  return supported;
}

/**
 * Replaces glyphs the embedded font cannot encode (emoji, CJK, symbols outside
 * WinAnsi) so drawText never throws, and reports how many were replaced.
 */
export function sanitizePdfText(text, font) {
  const source = text == null ? "" : String(text);
  if (!source) return { text: "", replacements: 0 };

  let output = "";
  let replacements = 0;

  for (const char of source) {
    const code = char.codePointAt(0);
    if (char === "\n" || char === "\r") {
      output += char;
      continue;
    }
    if (char === "\t") {
      output += "    ";
      continue;
    }
    if (char === " " || (code >= 0x20 && code < 0x7f) || isEncodableGlyph(font, char)) {
      output += char;
      continue;
    }
    output += UNSUPPORTED_GLYPH;
    replacements += 1;
  }

  return { text: output, replacements };
}

/**
 * Truncates text with an ellipsis so it never exceeds the measured width.
 */
export function truncateToWidth(text, font, size, maxWidth) {
  const value = String(text ?? "");
  if (measureTextWidth(font, value, size) <= maxWidth) return value;
  const ellipsis = "...";
  let low = 0;
  let high = value.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (measureTextWidth(font, `${value.slice(0, mid)}${ellipsis}`, size) <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low > 0 ? `${value.slice(0, low)}${ellipsis}` : "";
}

/**
 * Longest leading slice of a word that still fits inside maxWidth.
 */
function fitPrefixLength(font, word, size, maxWidth) {
  let cut = Math.min(word.length, Math.max(1, Math.floor(maxWidth / (size * FALLBACK_WIDTH_RATIO)) - 1));
  while (cut > 1 && measureTextWidth(font, word.slice(0, cut), size) > maxWidth) cut -= 1;
  while (cut < word.length && measureTextWidth(font, word.slice(0, cut + 1), size) <= maxWidth) cut += 1;
  return cut;
}

/**
 * Wraps text into lines that do not exceed maxWidth given a font and size.
 */
export function wrapText(text, font, size, maxWidth) {
  if (!text) return [];
  const normalized = String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ");
  const lines = [];

  for (const paragraph of normalized.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let currentLine = "";

    for (const word of words) {
      let remaining = word;

      while (measureTextWidth(font, remaining, size) > maxWidth && remaining.length > 1) {
        const cut = fitPrefixLength(font, remaining, size, maxWidth);
        if (cut < 1) break;
        if (currentLine) {
          lines.push(currentLine);
          currentLine = "";
        }
        lines.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut);
      }

      if (!remaining) continue;

      const candidate = currentLine ? `${currentLine} ${remaining}` : remaining;
      if (currentLine && measureTextWidth(font, candidate, size) > maxWidth) {
        lines.push(currentLine);
        currentLine = remaining;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

/**
 * Vertical metrics measured from the embedded font descriptor when available.
 */
function readFontMetrics(font, size) {
  const descriptor = font?.embedder?.font;
  const ascender = Number.isFinite(descriptor?.Ascender) ? descriptor.Ascender / 1000 : 0.75;
  const descender = Number.isFinite(descriptor?.Descender) ? Math.abs(descriptor.Descender) / 1000 : 0.25;
  return { ascender, descender, glyphHeight: (ascender + descender) * size };
}

/**
 * Baseline offset inside a line box, so measured text stays within its bounds.
 */
function baselineOffset(lineHeight, size, metrics) {
  const halfLeading = Math.max(0, (lineHeight - metrics.glyphHeight) / 2);
  return metrics.ascender * size + halfLeading;
}

/**
 * Builds the atomic, measurable flow units of a single note.
 */
function buildNoteAtoms({ note, fonts, bodyFontName }) {
  const body = sanitizePdfText(note?.text, fonts[bodyFontName]);
  const quoteSource = note?.quote ? sanitizePdfText(note.quote, fonts.italic) : { text: "", replacements: 0 };
  const bodyLines = wrapText(body.text, fonts[bodyFontName], BODY_SIZE, CARD_TEXT_WIDTH);
  const quoteLines = quoteSource.text
    ? wrapText(quoteSource.text, fonts.italic, QUOTE_SIZE, QUOTE_TEXT_WIDTH)
    : [];

  const atoms = [];
  if (quoteLines.length > 0) {
    atoms.push({ kind: "quoteTop", height: QUOTE_PAD });
    for (const line of quoteLines) atoms.push({ kind: "quoteLine", height: QUOTE_LINE_HEIGHT, line });
    atoms.push({ kind: "quoteBottom", height: QUOTE_PAD });
  }
  for (const line of bodyLines.length > 0 ? bodyLines : [""]) {
    atoms.push({ kind: "bodyLine", height: BODY_LINE_HEIGHT, line });
  }

  return { atoms, replacements: body.replacements + quoteSource.replacements };
}

/**
 * Lays out the whole notebook as draw commands without touching a PDFDocument.
 * Pages, cards, and quotes are measured against the embedded fonts, so a single
 * oversized note paginates instead of drawing below the bottom margin.
 */
export async function planNotesPdfLayout({
  notes = [],
  bookTitle = "Bookflow Reading Session",
  author = "",
  chapterTitle = "",
  progress = null,
  fonts,
  now = () => Date.now(),
  yieldIntervalMs = YIELD_INTERVAL_MS,
} = {}) {
  if (!fonts?.regular || !fonts?.bold || !fonts?.italic) {
    throw new TypeError("planNotesPdfLayout requires regular, bold, and italic fonts");
  }

  const safeNotes = Array.isArray(notes) ? notes : [];
  const noteCount = safeNotes.length;

  const title = sanitizePdfText(bookTitle || "Reading Session Notes", fonts.bold);
  const authorText = author ? sanitizePdfText(author, fonts.regular) : { text: "", replacements: 0 };
  const chapterText = chapterTitle ? sanitizePdfText(chapterTitle, fonts.regular) : { text: "", replacements: 0 };
  const displayTitle = title.text || "Reading Session Notes";

  const opsByPage = [[]];
  let pageIndex = 0;
  let currentY = PAGE_HEIGHT - MARGIN_TOP;
  let replacedGlyphs = title.replacements + authorText.replacements + chapterText.replacements;
  let lastYield = now();

  const emit = (op) => {
    if (!opsByPage[pageIndex]) opsByPage[pageIndex] = [];
    opsByPage[pageIndex].push(op);
  };
  const rect = (x, y, width, height, color, border) => emit({ kind: "rect", x, y, width, height, color, border });
  const circle = (x, y, size, color) => emit({ kind: "circle", x, y, size, color });
  const text = (value, options) => emit({ kind: "text", text: value, ...options });

  const drawRunningHeader = () => {
    const bandTop = PAGE_HEIGHT - MARGIN_TOP;
    rect(MARGIN_LEFT, bandTop - RUNNING_HEADER_BAND, USABLE_WIDTH, RUNNING_HEADER_BAND, COLOR_RUNNING_HEADER_BG);
    const centerY = bandTop - RUNNING_HEADER_BAND / 2;
    circle(MARGIN_LEFT + 10, centerY, 3.5, COLOR_DOT_RED);
    circle(MARGIN_LEFT + 20, centerY, 3.5, COLOR_DOT_YELLOW);
    circle(MARGIN_LEFT + 30, centerY, 3.5, COLOR_DOT_GREEN);
    const label = truncateToWidth(
      sanitizePdfText(`${displayTitle} • Reading Notes (Continued)`, fonts.regular).text,
      fonts.regular,
      8.5,
      USABLE_WIDTH - 50
    );
    if (label) {
      text(label, { x: MARGIN_LEFT + 42, y: centerY - 3, size: 8.5, font: "regular", color: COLOR_INK_MUTED });
    }
  };

  const beginPage = () => {
    pageIndex += 1;
    if (!opsByPage[pageIndex]) opsByPage[pageIndex] = [];
    currentY = PAGE_HEIGHT - MARGIN_TOP - RUNNING_HEADER_BLOCK;
    drawRunningHeader();
  };

  // --- 1. macOS window header banner on the first page ---
  const bannerTop = currentY;
  rect(
    MARGIN_LEFT,
    bannerTop - HEADER_BANNER_HEIGHT,
    USABLE_WIDTH,
    HEADER_BANNER_HEIGHT,
    COLOR_HEADER_BG,
    { color: COLOR_HEADER_BORDER, width: 1 }
  );

  const trafficY = bannerTop - 18;
  circle(MARGIN_LEFT + 16, trafficY, 4.5, COLOR_DOT_RED);
  circle(MARGIN_LEFT + 28, trafficY, 4.5, COLOR_DOT_YELLOW);
  circle(MARGIN_LEFT + 40, trafficY, 4.5, COLOR_DOT_GREEN);

  text(sanitizePdfText("BOOKFLOW • READING NOTEBOOK EXPORT", fonts.bold).text, {
    x: MARGIN_LEFT + 55,
    y: trafficY - 3,
    size: 7.5,
    font: "bold",
    color: COLOR_CYAN,
  });

  const titleLine = truncateToWidth(displayTitle, fonts.bold, 16, USABLE_WIDTH - 32);
  if (titleLine) {
    text(titleLine, { x: MARGIN_LEFT + 16, y: bannerTop - 45, size: 16, font: "bold", color: COLOR_INK_PRIMARY });
  }

  const metaParts = [];
  if (authorText.text) metaParts.push(`By ${authorText.text}`);
  if (chapterText.text) metaParts.push(chapterText.text);
  if (Number.isFinite(progress)) metaParts.push(`${progress}% read`);
  metaParts.push(`${noteCount} ${noteCount === 1 ? "note" : "notes"}`);
  metaParts.push(`Exported ${formatNoteDate(now())}`);

  const metaLine = truncateToWidth(
    sanitizePdfText(metaParts.join("  •  "), fonts.regular).text,
    fonts.regular,
    8.5,
    USABLE_WIDTH - 32
  );
  if (metaLine) {
    text(metaLine, { x: MARGIN_LEFT + 16, y: bannerTop - 68, size: 8.5, font: "regular", color: COLOR_INK_MUTED });
  }

  currentY = bannerTop - HEADER_BANNER_HEIGHT - 18;

  // --- 2. Empty state notice ---
  if (noteCount === 0) {
    rect(MARGIN_LEFT, currentY - 80, USABLE_WIDTH, 80, COLOR_CARD_BG, {
      color: COLOR_CARD_BORDER,
      width: 1,
    });
    text("No saved notes found for this session.", {
      x: MARGIN_LEFT + 24,
      y: currentY - 38,
      size: 12,
      font: "bold",
      color: COLOR_INK_PRIMARY,
    });
    text("Add notes during your reading session to export them as a styled notebook.", {
      x: MARGIN_LEFT + 24,
      y: currentY - 56,
      size: 9.5,
      font: "regular",
      color: COLOR_INK_MUTED,
    });
    currentY -= 95;
  }

  const bodyMetrics = {
    regular: readFontMetrics(fonts.regular, BODY_SIZE),
    bold: readFontMetrics(fonts.bold, BODY_SIZE),
  };
  const quoteMetrics = readFontMetrics(fonts.italic, QUOTE_SIZE);

  const drawCardChrome = (top, bottom) => {
    rect(MARGIN_LEFT, bottom, USABLE_WIDTH, top - bottom, COLOR_CARD_BG, {
      color: COLOR_CARD_BORDER,
      width: 1,
    });
  };

  const drawCardHeaderRow = (top, { label, isBold, timeText }) => {
    const rowY = top - CARD_PADDING_Y - 4;
    circle(MARGIN_LEFT + CARD_PADDING_X + 2, rowY, 2.8, COLOR_DOT_RED);
    circle(MARGIN_LEFT + CARD_PADDING_X + 9, rowY, 2.8, COLOR_DOT_YELLOW);
    circle(MARGIN_LEFT + CARD_PADDING_X + 16, rowY, 2.8, COLOR_DOT_GREEN);

    const timeWidth = timeText ? measureTextWidth(fonts.regular, timeText, 8) : 0;
    const leftLimit = MARGIN_LEFT + USABLE_WIDTH - CARD_PADDING_X - timeWidth - 8;
    const badgeX = MARGIN_LEFT + CARD_PADDING_X + 26;
    const badge = truncateToWidth(label, fonts.bold, 8, Math.max(12, leftLimit - badgeX));
    if (badge) {
      text(badge, { x: badgeX, y: rowY - 3, size: 8, font: "bold", color: COLOR_CYAN });
    }

    const tagX = MARGIN_LEFT + CARD_PADDING_X + 80;
    const tag = truncateToWidth(isBold ? "[ BOLD NOTE ]" : "[ REGULAR ]", fonts.bold, 7.5, Math.max(12, leftLimit - tagX));
    if (tag) {
      text(tag, {
        x: tagX,
        y: rowY - 3,
        size: 7.5,
        font: "bold",
        color: isBold ? COLOR_CYAN : COLOR_INK_MUTED,
      });
    }

    if (timeText) {
      text(timeText, {
        x: MARGIN_LEFT + USABLE_WIDTH - CARD_PADDING_X - timeWidth,
        y: rowY - 3,
        size: 8,
        font: "regular",
        color: COLOR_INK_MUTED,
      });
    }
  };

  const drawContinuationRow = (top, label) => {
    const ruleY = top - 13;
    const titleText = sanitizePdfText(`${label} • continued`, fonts.bold).text;
    const titleWidth = measureTextWidth(fonts.bold, titleText, 8);
    if (titleWidth > 0) {
      text(titleText, {
        x: MARGIN_LEFT + CARD_PADDING_X,
        y: top - 10,
        size: 8,
        font: "bold",
        color: COLOR_INK_MUTED,
      });
    }
    const ruleX = MARGIN_LEFT + CARD_PADDING_X + titleWidth + 8;
    const ruleRight = MARGIN_LEFT + USABLE_WIDTH - CARD_PADDING_X;
    if (ruleX < ruleRight) rect(ruleX, ruleY, ruleRight - ruleX, 0.75, COLOR_CARD_BORDER);
  };

  // --- 3. Note cards, paginated with measured line boxes ---
  for (let index = 0; index < noteCount; index += 1) {
    const note = safeNotes[index] ?? {};
    const isBold = note.bold === true;
    const bodyFontName = isBold ? "bold" : "regular";
    const { atoms, replacements } = buildNoteAtoms({ note, fonts, bodyFontName });
    replacedGlyphs += replacements;

    const label = `NOTE ${(index + 1).toString().padStart(2, "0")}`;
    const timeText = sanitizePdfText(formatNoteDate(note.createdAt), fonts.regular).text;
    let cursor = 0;
    let segment = 0;

    while (cursor < atoms.length) {
      const firstSegment = segment === 0;
      const topReserve = firstSegment ? CARD_PADDING_Y + CARD_HEADER_BLOCK : CONTINUATION_HEADER_BLOCK;

      if (currentY - topReserve - CARD_BOTTOM_RESERVE < CONTENT_FLOOR + MIN_SEGMENT_BODY) {
        beginPage();
      }

      const segmentTop = currentY;
      const startCursor = cursor;
      currentY -= topReserve;

      const placed = [];
      let quoteClosed = false;

      while (cursor < atoms.length) {
        const atom = atoms[cursor];
        if (cursor > startCursor && currentY - atom.height < CONTENT_FLOOR + CARD_BOTTOM_RESERVE) break;

        currentY -= atom.height;

        if (atom.kind === "quoteLine") {
          placed.push({
            kind: "quoteLine",
            line: atom.line,
            x: MARGIN_LEFT + CARD_PADDING_X + QUOTE_INSET,
            baseline: currentY + baselineOffset(QUOTE_LINE_HEIGHT, QUOTE_SIZE, quoteMetrics),
            y: currentY,
          });
        } else if (atom.kind === "bodyLine") {
          placed.push({
            kind: "bodyLine",
            line: atom.line,
            x: MARGIN_LEFT + CARD_PADDING_X,
            baseline: currentY + baselineOffset(BODY_LINE_HEIGHT, BODY_SIZE, bodyMetrics[bodyFontName]),
            y: currentY,
          });
        } else if (atom.kind === "quoteBottom") {
          quoteClosed = true;
        }

        cursor += 1;
      }

      const segmentBottom = currentY - CARD_BOTTOM_RESERVE;
      currentY = segmentBottom - CARD_GAP;

      // Paint order: card surface, quote surface, header row, then note text.
      drawCardChrome(segmentTop, segmentBottom);

      const quoteLines = placed.filter((item) => item.kind === "quoteLine");
      if (quoteLines.length > 0) {
        const first = quoteLines[0];
        const last = quoteLines[quoteLines.length - 1];
        const quoteTop = first.y + QUOTE_LINE_HEIGHT + QUOTE_PAD;
        const naturalBottom = last.y - QUOTE_PAD;
        const quoteBottom = quoteClosed
          ? naturalBottom
          : Math.min(segmentBottom - CARD_TAIL_GAP, naturalBottom);
        if (quoteTop > quoteBottom) {
          rect(MARGIN_LEFT + CARD_PADDING_X, quoteBottom, CARD_TEXT_WIDTH, quoteTop - quoteBottom, COLOR_QUOTE_BG);
          rect(MARGIN_LEFT + CARD_PADDING_X, quoteBottom, 3, quoteTop - quoteBottom, COLOR_QUOTE_BORDER);
        }
      }

      if (firstSegment) {
        drawCardHeaderRow(segmentTop, { label, isBold, timeText });
      } else {
        drawContinuationRow(segmentTop, label);
      }

      for (const item of placed) {
        const isQuote = item.kind === "quoteLine";
        if (!item.line) continue;
        text(item.line, {
          x: item.x,
          y: item.baseline,
          size: isQuote ? QUOTE_SIZE : BODY_SIZE,
          font: isQuote ? "italic" : bodyFontName,
          color: isQuote ? COLOR_INK_MUTED : isBold ? COLOR_INK_PRIMARY : COLOR_INK_BODY,
        });
      }

      segment += 1;
    }

    if (yieldIntervalMs > 0 && now() - lastYield >= yieldIntervalMs) {
      await yieldToHost();
      lastYield = now();
    }
  }

  return finalizeLayout(opsByPage, replacedGlyphs, fonts, noteCount);
}

/**
 * Appends the running footer and reports the measured content bounds.
 */
function finalizeLayout(opsByPage, replacedGlyphs, fonts, noteCount) {
  const pageCount = Math.max(1, opsByPage.length);
  const footerLabel = "Bookflow • Private & Local Reading Notebook";
  let minContentY = Number.POSITIVE_INFINITY;
  let maxContentRight = Number.NEGATIVE_INFINITY;

  for (let page = 0; page < pageCount; page += 1) {
    if (!opsByPage[page]) opsByPage[page] = [];

    const pageNumText = `Page ${page + 1} of ${pageCount}`;
    const pageNumWidth = measureTextWidth(fonts.regular, pageNumText, 8);
    opsByPage[page].push(
      {
        kind: "text",
        text: footerLabel,
        x: MARGIN_LEFT,
        y: 20,
        size: 8,
        font: "regular",
        color: COLOR_INK_MUTED,
        band: "footer",
      },
      {
        kind: "text",
        text: pageNumText,
        x: PAGE_WIDTH - MARGIN_RIGHT - pageNumWidth,
        y: 20,
        size: 8,
        font: "regular",
        color: COLOR_INK_MUTED,
        band: "footer",
      }
    );

    for (const op of opsByPage[page]) {
      if (op.kind !== "text" || op.band === "footer") continue;
      const font = fonts[op.font] ?? fonts.regular;
      const right = op.x + measureTextWidth(font, op.text, op.size);
      if (op.y < minContentY) minContentY = op.y;
      if (right > maxContentRight) maxContentRight = right;
    }
  }

  return {
    pageCount,
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
    marginLeft: MARGIN_LEFT,
    marginRight: MARGIN_RIGHT,
    marginBottom: MARGIN_BOTTOM,
    replacedGlyphs,
    noteCount,
    minContentY: minContentY === Number.POSITIVE_INFINITY ? PAGE_HEIGHT : minContentY,
    maxContentRight: maxContentRight === Number.NEGATIVE_INFINITY ? MARGIN_LEFT : maxContentRight,
    pages: opsByPage.slice(0, pageCount).map((ops, index) => ({ index, ops })),
  };
}

async function embedStandardFonts(pdfDoc) {
  const [regular, bold, italic] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.HelveticaOblique),
  ]);
  return { regular, bold, italic };
}

/**
 * Applies a layout plan to a PDFDocument and returns the finished document.
 */
export async function renderNotesPdfDocument(options = {}) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await embedStandardFonts(pdfDoc);
  const plan = await planNotesPdfLayout({ ...options, fonts });
  const pages = plan.pages.map(() => pdfDoc.addPage([plan.pageWidth, plan.pageHeight]));

  let sinceYield = 0;
  for (const page of plan.pages) {
    const target = pages[page.index];
    for (const op of page.ops) {
      if (op.kind === "rect") {
        target.drawRectangle({
          x: op.x,
          y: op.y,
          width: op.width,
          height: op.height,
          color: rgb(...op.color),
          ...(op.border
            ? { borderColor: rgb(...op.border.color), borderWidth: op.border.width }
            : {}),
        });
      } else if (op.kind === "circle") {
        target.drawCircle({ x: op.x, y: op.y, size: op.size, color: rgb(...op.color) });
      } else if (op.kind === "text") {
        target.drawText(op.text, {
          x: op.x,
          y: op.y,
          size: op.size,
          font: fonts[op.font] ?? fonts.regular,
          color: rgb(...op.color),
        });
      }

      sinceYield += 1;
      if (sinceYield >= YIELD_OP_INTERVAL) {
        sinceYield = 0;
        await yieldToHost();
      }
    }
  }

  return { pdfDoc, plan };
}

/**
 * Generates a PDFDocument with notes styled as macOS cards and preserving bold formatting.
 */
export async function buildNotesPdf(options = {}) {
  const { pdfDoc } = await renderNotesPdfDocument(options);
  return pdfDoc;
}

/**
 * High-level export function that builds the PDF and triggers browser download.
 */
export async function exportNotesAsPdf({
  notes = [],
  bookTitle = "Bookflow Reading Session",
  author = "",
  chapterTitle = "",
  progress = null,
} = {}) {
  const { pdfDoc, plan } = await renderNotesPdfDocument({
    notes,
    bookTitle,
    author,
    chapterTitle,
    progress,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  downloadBlob(blob, notesFilename(bookTitle, "pdf"));

  return { size: pdfBytes.length, pages: plan.pageCount, replacedGlyphs: plan.replacedGlyphs };
}
