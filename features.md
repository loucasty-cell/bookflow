# Bookflow Features and Capabilities

Bookflow is a private, high-focus document reading environment with a React frontend and a FastAPI backend designed for deep reading, cognitive flow retention, rich document processing, and high-throughput visual OCR scanning.

---

## 1. Core Reading & Cognitive Flow Experience

### Sentence & Paragraph Focus Rail
- **Scroll-Driven Focus**: As the reader scrolls, a gentle highlight settles on the active sentence or paragraph near the golden-ratio focal line (`FOCUS_RAIL_RATIO = 0.382`).
- **Pinned Focus**: Readers can pin an active paragraph with a click, tap, or `Space`/`Enter`/`Escape` keypress, freezing focus while freely scrolling nearby context.
- **Atmosphere Modes**:
  - **Paper Mode**: Clean, warm off-white palette (`#FFFEFA`) inspired by physical book printing.
  - **Dusk Mode**: Deep near-black background (`#000000` surroundings, `#070708` reading surface) with soft contrasting text designed for night reading.
- **Focus Intensities**:
  - `Soft`: Gentle background emphasis.
  - `Deep`: High-contrast emphasis with subdued non-active paragraphs.
  - `Off`: Clean continuous reading view.
- **Customizable Typography**: Real-time slider adjustments for font size (14px - 28px), line height (1.5 - 2.2), and reader column width (560px - 880px / 60-75ch measure).

### Behavioral Engagement & Habit Formation
- **Variable Reward Marginalia Capsules**: Unannounced, high-signal intellectual syntheses and cross-domain connections unlocked upon completing a chapter.
- **Cognitive Flow Sparkline**: Organic visualization of reading pace stability and deep-focus streaks.
- **Next-Chapter Horizon Teasers**: Contextual 2-line curiosity bridges that preview upcoming narrative tensions to prevent drop-off.
- **4-Minute Drop-Off Intervention Engine**: Telemetry-driven ambient micro-prompts utilizing the curiosity gap and loss aversion to re-anchor drifting attention.
- **Asynchronous In-Margin Social Layer**: Privacy-preserving SHA-256 paragraph hash matching for shared community thought whispers and time-shifted reaction capsules.

---

## 2. Document Processing & Formats

### Supported Document Types
- **PDF Documents**: Native text extraction with page-by-page progress reporting; handles embedded images and multi-page layouts. Uses PyMuPDF as the primary parser with pypdf as fallback.
- **EPUB Ebooks**: Extracts OPF metadata, spine order, chapter navigation, and subheadings across EPUB 2 and EPUB 3 files.
- **Markdown (`.md`, `.markdown`)**: Automatically converts top-level headings to chapters and subheadings to reading sections.
- **Plain Text (`.txt`)**: Parses paragraphs with smart chapter demarcation heuristics.

### Front Matter & End Matter Filtering
- Heuristics automatically detect non-body sections (Table of Contents, Copyright notices, Index, Dedication, Author Bio) and exempt them from intrusive focus highlighting.

---

## 3. High-Throughput Visual OCR Engine

### Configured Hugging Face Serverless OCR (Opt-in)
- **`POST /api/ocr/scan`**: In-memory 96 DPI rendering via PyMuPDF with concurrent page batching dispatched to the model configured in `OCR_MODEL` through the selected Hugging Face endpoint.
- **Real-Time SSE Streaming**: `GET /api/ocr/progress/{job_id}` streams page completions, velocity (pages/sec), word counts, and 8s heartbeat keepalives.
- **Native Text Microsecond Fast Path**: Selectable PDF pages with >= 15 words bypass rasterization, processing 600+ page documents in under 1 second.
- **Active Job Cancellation**: `POST /api/ocr/cancel/{job_id}` aborts processing and frees resources immediately.
- **Structured Markdown & Chapter Hierarchy**: Reconstructs continuous multi-page chapter trees from `# Markdown Headings`.

---

## 4. Performance & Privacy Guarantees

- **Zero Document Cloud Uploads**: All imported book contents stay on the reader's device.
- **Code-Splitting**: Heavy components (`BookOpeningIntro`, `OcrUploader`) lazy-loaded on demand.
- **Instant Video Skip**: Click-anywhere and Skip button for the opening intro video.
