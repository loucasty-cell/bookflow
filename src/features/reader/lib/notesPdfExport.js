import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Wraps text into lines that do not exceed maxWidth given a font and size.
 */
export function wrapText(text, font, size, maxWidth) {
  if (!text) return [];
  const normalized = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragraphs = normalized.split("\n");
  const lines = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push("");
      continue;
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      let width = 0;
      try {
        width = font.widthOfTextAtSize(candidate, size);
      } catch {
        // Fallback for non-latin or unsupported standard font glyphs
        width = candidate.length * (size * 0.55);
      }

      if (width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

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
 * Sanitizes book title into a safe filename.
 */
export function sanitizeFilename(title) {
  if (!title) return "bookflow-reading-notes";
  const safe = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe ? `${safe}-notes` : "bookflow-reading-notes";
}

/**
 * Generates a PDFDocument with notes styled as macOS cards and preserving bold formatting.
 */
export async function buildNotesPdf({
  notes = [],
  bookTitle = "Bookflow Reading Session",
  author = "",
  chapterTitle = "",
  progress = null,
}) {
  const pdfDoc = await PDFDocument.create();

  // Standard Type 1 fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // A4 Page Dimensions (in points: 72 points = 1 inch)
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 42;
  const MARGIN_RIGHT = 42;
  const MARGIN_TOP = 42;
  const MARGIN_BOTTOM = 46;
  const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  // macOS Color Palette
  const COLOR_BG_WHITE = rgb(1, 1, 1);
  const COLOR_CARD_BG = rgb(0.975, 0.982, 0.99);
  const COLOR_CARD_BORDER = rgb(0.85, 0.88, 0.92);
  const COLOR_HEADER_BG = rgb(0.95, 0.965, 0.98);
  const COLOR_HEADER_BORDER = rgb(0.84, 0.87, 0.92);
  const COLOR_INK_PRIMARY = rgb(0.08, 0.1, 0.14);
  const COLOR_INK_MUTED = rgb(0.42, 0.46, 0.52);
  const COLOR_CYAN = rgb(0.02, 0.62, 0.75);
  const COLOR_PURPLE = rgb(0.52, 0.35, 0.92);
  const COLOR_QUOTE_BG = rgb(0.955, 0.95, 0.985);
  const COLOR_QUOTE_BORDER = rgb(0.55, 0.38, 0.95);

  // macOS Traffic Light dots
  const DOT_RED = rgb(1, 0.37, 0.34);
  const DOT_YELLOW = rgb(1, 0.74, 0.18);
  const DOT_GREEN = rgb(0.16, 0.8, 0.28);

  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let currentY = PAGE_HEIGHT - MARGIN_TOP;

  // Helper to ensure new page with running header if content overflows
  const ensureSpace = (neededHeight) => {
    if (currentY - neededHeight < MARGIN_BOTTOM) {
      currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      currentY = PAGE_HEIGHT - MARGIN_TOP;

      // Draw minimal running header on subsequent pages
      currentPage.drawRectangle({
        x: MARGIN_LEFT,
        y: currentY - 20,
        width: USABLE_WIDTH,
        height: 20,
        color: rgb(0.97, 0.975, 0.985),
      });

      currentPage.drawCircle({ x: MARGIN_LEFT + 10, y: currentY - 10, size: 3.5, color: DOT_RED });
      currentPage.drawCircle({ x: MARGIN_LEFT + 20, y: currentY - 10, size: 3.5, color: DOT_YELLOW });
      currentPage.drawCircle({ x: MARGIN_LEFT + 30, y: currentY - 10, size: 3.5, color: DOT_GREEN });

      const subHeader = `${bookTitle} • Reading Notes (Continued)`;
      currentPage.drawText(subHeader, {
        x: MARGIN_LEFT + 42,
        y: currentY - 13,
        size: 8.5,
        font: fontRegular,
        color: COLOR_INK_MUTED,
      });

      currentY -= 32;
    }
  };

  // --- 1. macOS Window Header Banner (First Page) ---
  const headerBannerHeight = 84;
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - headerBannerHeight,
    width: USABLE_WIDTH,
    height: headerBannerHeight,
    color: COLOR_HEADER_BG,
    borderColor: COLOR_HEADER_BORDER,
    borderWidth: 1,
  });

  // macOS Traffic Light Dots
  const trafficY = currentY - 18;
  currentPage.drawCircle({ x: MARGIN_LEFT + 16, y: trafficY, size: 4.5, color: DOT_RED });
  currentPage.drawCircle({ x: MARGIN_LEFT + 28, y: trafficY, size: 4.5, color: DOT_YELLOW });
  currentPage.drawCircle({ x: MARGIN_LEFT + 40, y: trafficY, size: 4.5, color: DOT_GREEN });

  // Top App Title
  currentPage.drawText("BOOKFLOW • READING NOTEBOOK EXPORT", {
    x: MARGIN_LEFT + 55,
    y: trafficY - 3,
    size: 7.5,
    font: fontBold,
    color: COLOR_CYAN,
  });

  // Book Title
  const titleDisplay = String(bookTitle || "Reading Session Notes");
  const truncatedTitle = titleDisplay.length > 55 ? `${titleDisplay.slice(0, 52)}...` : titleDisplay;
  currentPage.drawText(truncatedTitle, {
    x: MARGIN_LEFT + 16,
    y: currentY - 45,
    size: 16,
    font: fontBold,
    color: COLOR_INK_PRIMARY,
  });

  // Telemetry metadata line
  const metaParts = [];
  if (author) metaParts.push(`By ${author}`);
  if (chapterTitle) metaParts.push(chapterTitle);
  if (Number.isFinite(progress)) metaParts.push(`${progress}% read`);
  metaParts.push(`${notes.length} ${notes.length === 1 ? "note" : "notes"}`);
  metaParts.push(`Exported ${formatNoteDate(Date.now())}`);

  currentPage.drawText(metaParts.join("  •  "), {
    x: MARGIN_LEFT + 16,
    y: currentY - 68,
    size: 8.5,
    font: fontRegular,
    color: COLOR_INK_MUTED,
  });

  currentY -= headerBannerHeight + 18;

  // --- 2. Empty State Notice if No Notes ---
  if (!notes.length) {
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: currentY - 80,
      width: USABLE_WIDTH,
      height: 80,
      color: COLOR_CARD_BG,
      borderColor: COLOR_CARD_BORDER,
      borderWidth: 1,
    });
    currentPage.drawText("No saved notes found for this session.", {
      x: MARGIN_LEFT + 24,
      y: currentY - 38,
      size: 12,
      font: fontBold,
      color: COLOR_INK_PRIMARY,
    });
    currentPage.drawText("Add notes during your reading session to export them as a styled notebook.", {
      x: MARGIN_LEFT + 24,
      y: currentY - 56,
      size: 9.5,
      font: fontRegular,
      color: COLOR_INK_MUTED,
    });
    currentY -= 95;
  }

  // --- 3. Note Cards Rendering ---
  const CARD_PADDING_X = 14;
  const CARD_PADDING_Y = 12;
  const TEXT_WIDTH = USABLE_WIDTH - CARD_PADDING_X * 2;

  notes.forEach((note, index) => {
    const isBold = Boolean(note.bold);
    const bodyFont = isBold ? fontBold : fontRegular;
    const bodyFontSize = 10.5;
    const bodyLineHeight = 15;

    // Wrap body text
    const bodyLines = wrapText(note.text || "", bodyFont, bodyFontSize, TEXT_WIDTH);

    // Wrap quote text if present
    const quoteFontSize = 9.5;
    const quoteLineHeight = 13.5;
    const QUOTE_INNER_WIDTH = TEXT_WIDTH - 20; // accounting for left accent border and indent
    const quoteLines = note.quote
      ? wrapText(note.quote, fontItalic, quoteFontSize, QUOTE_INNER_WIDTH)
      : [];

    // Calculate card height
    let cardHeight = CARD_PADDING_Y * 2;
    cardHeight += 20; // Header: Traffic dots + Note # + Format tag + Date

    let quoteBoxHeight = 0;
    if (quoteLines.length > 0) {
      quoteBoxHeight = quoteLines.length * quoteLineHeight + 12;
      cardHeight += quoteBoxHeight + 8;
    }

    const bodyHeight = Math.max(1, bodyLines.length) * bodyLineHeight;
    cardHeight += bodyHeight + 4;

    // Check if card fits on current page
    ensureSpace(cardHeight + 14);

    const cardTop = currentY;
    const cardBottom = cardTop - cardHeight;

    // Draw Card Background and Border
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: cardBottom,
      width: USABLE_WIDTH,
      height: cardHeight,
      color: COLOR_CARD_BG,
      borderColor: COLOR_CARD_BORDER,
      borderWidth: 1,
    });

    // Card Top Bar: Mini macOS Traffic Dots
    let innerY = cardTop - CARD_PADDING_Y - 4;
    currentPage.drawCircle({ x: MARGIN_LEFT + CARD_PADDING_X + 2, y: innerY, size: 2.8, color: DOT_RED });
    currentPage.drawCircle({ x: MARGIN_LEFT + CARD_PADDING_X + 9, y: innerY, size: 2.8, color: DOT_YELLOW });
    currentPage.drawCircle({ x: MARGIN_LEFT + CARD_PADDING_X + 16, y: innerY, size: 2.8, color: DOT_GREEN });

    // Note Index Badge
    const noteBadge = `NOTE ${(index + 1).toString().padStart(2, "0")}`;
    currentPage.drawText(noteBadge, {
      x: MARGIN_LEFT + CARD_PADDING_X + 26,
      y: innerY - 3,
      size: 8,
      font: fontBold,
      color: COLOR_CYAN,
    });

    // Bold/Regular Formatting Pill Tag
    const formatTag = isBold ? "BOLD NOTE" : "REGULAR";
    const tagFont = fontBold;
    const tagSize = 7.5;
    const tagColor = isBold ? COLOR_CYAN : COLOR_INK_MUTED;
    currentPage.drawText(`[ ${formatTag} ]`, {
      x: MARGIN_LEFT + CARD_PADDING_X + 80,
      y: innerY - 3,
      size: tagSize,
      font: tagFont,
      color: tagColor,
    });

    // Timestamp (Right aligned inside card)
    const timeText = formatNoteDate(note.createdAt);
    const timeWidth = fontRegular.widthOfTextAtSize(timeText, 8);
    currentPage.drawText(timeText, {
      x: MARGIN_LEFT + USABLE_WIDTH - CARD_PADDING_X - timeWidth,
      y: innerY - 3,
      size: 8,
      font: fontRegular,
      color: COLOR_INK_MUTED,
    });

    innerY -= 16;

    // Draw Quoted Passage Box if present
    if (quoteLines.length > 0) {
      const quoteBoxTop = innerY;
      const quoteBoxBottom = quoteBoxTop - quoteBoxHeight;

      // Quote Box Background
      currentPage.drawRectangle({
        x: MARGIN_LEFT + CARD_PADDING_X,
        y: quoteBoxBottom,
        width: TEXT_WIDTH,
        height: quoteBoxHeight,
        color: COLOR_QUOTE_BG,
      });

      // Left Accent Border (Purple)
      currentPage.drawRectangle({
        x: MARGIN_LEFT + CARD_PADDING_X,
        y: quoteBoxBottom,
        width: 3,
        height: quoteBoxHeight,
        color: COLOR_QUOTE_BORDER,
      });

      // Quote text lines
      let quoteTextY = quoteBoxTop - 10;
      for (const qLine of quoteLines) {
        currentPage.drawText(qLine, {
          x: MARGIN_LEFT + CARD_PADDING_X + 10,
          y: quoteTextY,
          size: quoteFontSize,
          font: fontItalic,
          color: COLOR_INK_MUTED,
        });
        quoteTextY -= quoteLineHeight;
      }

      innerY = quoteBoxBottom - 8;
    }

    // Draw Note Body Text (Bold font if note.bold is true, regular if false)
    let bodyTextY = innerY - 2;
    for (const line of bodyLines) {
      if (line) {
        currentPage.drawText(line, {
          x: MARGIN_LEFT + CARD_PADDING_X,
          y: bodyTextY,
          size: bodyFontSize,
          font: bodyFont,
          color: isBold ? COLOR_INK_PRIMARY : rgb(0.14, 0.16, 0.2),
        });
      }
      bodyTextY -= bodyLineHeight;
    }

    // Step down for next card
    currentY -= cardHeight + 12;
  });

  // --- 4. Running Footer on All Pages ---
  const totalPages = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();
  for (let i = 0; i < totalPages; i++) {
    const p = pages[i];
    const footerText = `Bookflow • Private & Local Reading Notebook`;
    const pageNumText = `Page ${i + 1} of ${totalPages}`;

    p.drawText(footerText, {
      x: MARGIN_LEFT,
      y: 20,
      size: 8,
      font: fontRegular,
      color: COLOR_INK_MUTED,
    });

    const pageNumWidth = fontRegular.widthOfTextAtSize(pageNumText, 8);
    p.drawText(pageNumText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - pageNumWidth,
      y: 20,
      size: 8,
      font: fontRegular,
      color: COLOR_INK_MUTED,
    });
  }

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
}) {
  const pdfDoc = await buildNotesPdf({
    notes,
    bookTitle,
    author,
    chapterTitle,
    progress,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(bookTitle)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { size: pdfBytes.length, pages: pdfDoc.getPageCount() };
}
