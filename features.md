# Bookflow Features & Capabilities

Bookflow is a private, high-focus document reading environment with a React/Vite frontend and a FastAPI backend designed for deep reading, cognitive flow retention, rich document processing, and high-throughput visual OCR scanning.

---

## 1. Core Reading & Cognitive Flow Experience

### 1.1 Sentence & Paragraph Focus Rail
- **Scroll-Driven Focus**: As the reader scrolls, a gentle highlight settles on the active sentence or paragraph near the golden reading horizon (`FOCUS_RAIL_RATIO = 0.42`).
- **Pinned Focus**: Readers can pin an active paragraph with a click, tap, or `Space`/`Enter`/`Escape` keypress, freezing focus while freely scrolling nearby context.
- **Atmosphere Modes**:
  - **Paper Mode**: Clean, warm off-white palette (`#FFFEFA`) inspired by physical book printing.
  - **Dusk Mode**: Deep near-black background (`#0B0F19` canvas, `#121826` reading card) with soft contrasting text designed for night reading without OLED smearing.
  - **Tint (Remix) Mode**: Soothing sepia-toned ambient reading theme (`#F4EFEA`).
- **Focus Intensities**:
  - `Soft`: Gentle background emphasis.
  - `Deep`: High-contrast emphasis with subdued non-active paragraphs.
  - `Off`: Clean continuous reading view.

### 1.2 Bionic Reading & Saccadic Fixation Engine
- **Fixation Grapheme Anchoring**: Automatically bolds the initial 1–3 letters of words based on dynamic length calculations (`getFixationLength`), guiding saccadic eye movements.
- **Pure React Tokenizer**: `formatParagraphText` formats text using safe React element trees without `dangerouslySetInnerHTML`.
- **Instant Toggle**: Toggle between Standard text and Bionic fixations in the reading settings popover.

### 1.3 Neurodivergent & Accessible Typography System
- **Typeface Switcher**:
  - **Serif**: Classic literary serif (`Georgia, Cambria, Times`).
  - **Sans**: Crisp native system stack (`SF Pro, Segoe UI, Roboto`).
  - **Clean (Hyperlegible)**: High-distinction letterforms (`Atkinson Hyperlegible`).
  - **Dyslexic**: Weighted baselines (`OpenDyslexic`) to prevent letter inversion.
- **Letter Tracking (Character Spacing)**:
  - `Default (0.002em)`: Balanced optical rhythm.
  - `Wide (0.035em)`: Reduced inter-character crowding for visual processing ease.
  - `Spacious (0.07em)`: Maximum separation for dyslexia accommodation.
- **Slider Adjustments**: Real-time slider adjustments for font size (17px - 24px), line height (1.5 - 2.2), reader column width (720px - 1120px), and focus pace (180ms - 420ms).

### 1.4 Contextual Selection Tooltip (`SelectionTooltip`)
- **Floating Toolbar**: Renders above selected text within the reader canvas.
- **Instant Actions**: Create margin notes, copy to clipboard with haptic feedback, or bookmark paragraph.

### 1.5 Editorial Typography & Semantic Styles
- **Drop Caps**: Elegant first-letter drop caps on chapter opening paragraphs with brand blue accenting.
- **Keyword Highlights (`.kw`)**: Subtle background tinting for critical conceptual terms.
- **Pull Quotes (`.pullq`)**: Indented, italicized quotes with brand royal left borders.
- **Insight Callout Boxes (`.insight-box`)**: Warm amber insight containers with structured uppercase badges.

### 1.6 Behavioral Engagement & Habit Formation
- **Variable Reward Marginalia Capsules**: Unannounced, high-signal intellectual syntheses and cross-domain connections unlocked upon completing a chapter.
- **Cognitive Flow Sparkline**: Organic visualization of reading pace stability and deep-focus streaks.
- **Next-Chapter Horizon Teasers**: Contextual 2-line curiosity bridges that preview upcoming narrative tensions.
- **4-Minute Drop-Off Intervention Engine**: Telemetry-driven ambient micro-prompts utilizing the curiosity gap and loss aversion to re-anchor drifting attention.
- **Asynchronous In-Margin Social Layer**: Privacy-preserving SHA-256 paragraph hash matching for shared community thought whispers and time-shifted reaction capsules.

---

## 2. Document Processing & Formats

### 2.1 Supported Document Types
- **PDF Documents**: Native text extraction with page-by-page progress reporting; handles embedded images and multi-page layouts.
- **EPUB Ebooks**: Extracts OPF metadata, spine order, chapter navigation, and subheadings across EPUB 2 and EPUB 3 files.
- **Markdown (`.md`, `.markdown`)**: Automatically converts top-level headings to chapters and subheadings to reading sections.
- **Plain Text (`.txt`)**: Parses paragraphs with smart chapter demarcation heuristics.

### 2.2 Paragraph Classification Taxonomy
- Heuristic and rule-based classifier categorizing prose into:
  1. `DIALOGUE` (Pure dialogue & dialogue + action beats)
  2. `ACTION` (Physical movement and real-time events)
  3. `DESCRIPTIVE` (Sensory details and worldbuilding)
  4. `EXPOSITORY` (Background lore and history)
  5. `INTERNAL_MONOLOGUE` (Character thoughts and reflections)
  6. `STRUCTURAL_MARKER` (Headings, dividers, scene breaks)
  7. `VERSE / POETRY` (Line-broken poetic structures)

---

## 3. High-Throughput Visual OCR Engine

### 3.1 Multi-Tiered OCR Pipeline
- **`POST /api/ocr/scan`**: In-memory 96 DPI rendering via PyMuPDF with concurrent page batching routed to PaddleOCR when configured, then Hugging Face Vision (Qwen2-VL / DeepSeek-OCR-2) with cold-start recovery.
- **Real-Time SSE Streaming**: `GET /api/ocr/progress/{job_id}` streams page completions, velocity (pages/sec), word counts, and 8s heartbeat keepalives.
- **Native Text Fast Path**: Selectable PDF pages with >= 15 words bypass rasterization in < 1ms.
- **Active Job Cancellation**: `POST /api/ocr/cancel/{job_id}` aborts processing and frees memory immediately.

---

## 4. Performance, Resilience & Privacy

- **Zero Document Cloud Uploads**: All imported book contents stay on the user's device by default.
- **Resilient Error Boundaries**: Subtree and root-level `ErrorBoundary` components isolate rendering errors with one-tap reset.
- **Code-Splitting**: Heavy components (`OcrUploader`, `BookOpeningIntro`) lazy-loaded on demand.
- **Reduced Motion**: Full compliance with `prefers-reduced-motion: reduce`.

---

## 5. AI Coding & Technical Document Research Frontiers

- **AST-Guided Structural Chunking**: Hierarchical code folding and scoped block navigation for Markdown technical books and programming documentation.
- **Code Token Bionic Fixation**: Fixation weighting on syntax keywords and control flow branches for high-velocity code scanning.
- **Contextual Concept Graphs**: In-memory cross-chapter entity definition linking.
- **Dual-Pane Code-Prose Highlighting**: Synchronized line-level highlighting between architectural explanations and code listings.

