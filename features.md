# Bookflow Features and Capabilities

Bookflow is a private, high-focus document reading environment with a React frontend and a FastAPI backend designed for calm reading, rich document processing, and fast Hugging Face Vision OCR scanning.

---

## 1. Core Reading Experience

### Sentence Focus Rail
- **Scroll-Driven Focus**: As the reader scrolls, a gentle highlight settles on the active sentence or paragraph near 42% of the reader viewport.
- **Pinned Focus**: Readers can pin an active paragraph with a click, tap, or `Space`/`Enter` keypress, freezing focus while freely scrolling nearby context.
- **Atmosphere Modes**:
  - **Paper Mode**: Clean, warm off-white palette inspired by physical book printing.
  - **Dusk Mode**: Deep near-black background with soft contrasting text designed for night reading.
- **Focus Intensities**:
  - `Soft`: Gentle background emphasis.
  - `Deep`: High-contrast emphasis with subdued non-active paragraphs.
  - `Off`: Clean continuous reading view.
- **Customizable Typography**: Real-time slider adjustments for font size (16px - 28px), line height (1.5 - 2.2), and reader column width (560px - 880px).

---

## 2. Document Processing & Formats

### Supported Document Types
- **PDF Documents**: Native text extraction with page-by-page progress reporting; handles embedded images and multi-page layouts.
- **EPUB Ebooks**: Extracts OPF metadata, spine order, chapter navigation, and subheadings across EPUB 2 and EPUB 3 files.
- **Markdown (`.md`, `.markdown`)**: Automatically converts top-level headings to chapters and subheadings to reading sections.
- **Plain Text (`.txt`)**: Parses paragraphs with smart chapter demarcation heuristics.

### Front Matter & End Matter Filtering
- Heuristics automatically detect non-body sections (Table of Contents, Copyright notices, Index, Dedication, Author Bio) and exempt them from intrusive focus highlighting.

---

## 3. Hugging Face Image-to-Text OCR Engine

Bookflow provides an accelerated OCR subsystem in the FastAPI backend powered by Hugging Face Vision and Image-to-Text models.

### Key Capabilities
- **Fast Image OCR (`POST /api/ocr/image`)**: Converts scanned images or photos of pages into structured text in under 200ms.
- **Concurrent Batch Processing (`POST /api/ocr/batch`)**: Parallelized image processing with async worker pools and semaphore control.
- **Scanned PDF Pipeline (`POST /api/ocr/pdf`)**: Extracts native text when available, and automatically routes scanned raster pages to Hugging Face Vision models.
- **Image Preprocessing**:
  - Automatic EXIF orientation correction.
  - RGB normalization.
  - Smart aspect-ratio resizing to optimize network transmission and inference speed.
- **Supported Vision Models**:
  - `microsoft/trocr-base-stage1`: Fast, general-purpose transformer OCR for printed and handwritten text.
  - `microsoft/trocr-large-printed`: High-accuracy model optimized for dense typography in physical books.
  - `stepfun-ai/GOT-OCR2_0`: Comprehensive General OCR Theory model for full-page scans with formatting.
  - `facebook/nougat-base`: Specialized OCR for academic papers, math formulas, and tables.

---

## 4. Margin Notes & Bookmarks

- **Paragraph Quotes**: Create margin notes linked to the active paragraph with an excerpt quote.
- **Quick Bookmarking**: Bookmark key passages with a single shortcut or icon click.
- **Local Persistence**: Notes, bookmarks, reading position, and reader preferences persist across browser sessions in `localStorage`.
- **Export & Import**: Structured JSON export and import endpoints (`/api/reader/notes/export` and `/api/reader/notes/import`) allow backing up or moving notes across devices.

---

## 5. Accessibility and Performance

- **Keyboard Navigation**: Full keyboard control for navigating chapters, pinning paragraphs, adjusting font sizes, and toggling panels.
- **Motion Reduction**: Respects user's `prefers-reduced-motion` system settings for transitions.
- **Zero Distractions**: No social feeds, gamification badges, or popup ads.
- **Bundle Optimization**: Lazy-loaded PDF, EPUB, and OCR dependencies to maintain fast initial page load times.

---

## 6. Privacy & Security Architecture

1. **Local-First Processing**: Document parsing can execute 100% on the user's device in the browser without network access.
2. **Opt-in Backend Acceleration**: Backend document parsing and Hugging Face OCR run on-demand without persistent storage of book content.
3. **No Tracking or Telemetry**: No third-party analytics trackers, session recorders, or ad network scripts.
4. **Safe Rendering**: All book text is rendered via React text nodes to prevent XSS (no `dangerouslySetInnerHTML`).
