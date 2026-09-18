# Bookflow Ideas and Development Plan

**Document status:** Evidence-informed product and engineering plan.

**Repository reviewed:** `loucasty-cell/bookflow`.

**Important scope note:** This plan is a recommendation and validation document, not a claim that the repository already implements every feature below. The current project already has a strong foundation: React/Vite frontend, Zustand state, Framer Motion, PDF.js, JSZip, Tesseract.js, an optional FastAPI OCR backend, PaddleOCR-compatible routing, an SSE pipeline, a normalized book contract, focus-rail reading, notes, bookmarks, bionic reading, accessibility typefaces, and Three.js-related UI work. The repository's own agent guidance also establishes local-first privacy, React text nodes instead of `dangerouslySetInnerHTML`, lazy parsing, native PDF text before OCR, and bounded concurrency.

## 1. Product thesis

Bookflow should not try to make reading addictive in the same way as social media. That would create distraction, compulsive checking, and unhealthy engagement. The defensible product goal is **high-retention reading**: make it easy to start, easy to continue, satisfying to finish, and useful to remember.

The core loop should be:

```text
Import one owned document
  -> see a clear first reading action
  -> read a stable chunk
  -> receive lightweight progress feedback
  -> remember or annotate something meaningful
  -> stop safely or continue by choice
  -> return to the exact next place
```

Use the language of flow, momentum, and completion rather than psychological manipulation. Avoid infinite feeds, variable rewards, streak punishment, loot boxes, fake urgency, autoplay, or notifications designed to interrupt users.

## 2. Why PDFs are unpleasant

People do not necessarily hate books; they often hate the interaction cost around PDF reading.

- Many PDFs are fixed-layout documents, not reflowable books. Text can be tiny, columns can be awkward, and the reader must zoom and pan.
- Vertical scrolling destroys stable spatial landmarks. A reader loses the location of a paragraph and has more difficulty looking back.
- On small screens, only a small amount of text is visible, increasing navigation and working-memory demands.
- Scanned PDFs may have no usable text layer, so search, selection, highlighting, and screen readers fail.
- Headers, footers, page numbers, broken line wraps, hyphenation, columns, and repeated OCR errors pollute extracted text.
- Common viewers expose powerful controls but not a coherent reading session. The user must manually choose zoom, layout, theme, focus, and progress behavior.
- Academic PDFs often mix prose, equations, tables, citations, references, figures, and captions. A plain text extractor cannot reconstruct all of that correctly.
- The file may be large, causing long initial parsing, high memory consumption, or a frozen interface.
- Reading on a notification-heavy device creates task switching and attention leakage.

These are design problems that Bookflow can reduce, not reasons to claim that all screen reading is inherently bad.

## 3. What the evidence actually says

A 2026 network meta-analysis of 56 studies and 79 effect sizes ranked paper highest for expository reading comprehension, followed by tablets, e-readers, computers, and smartphones. The important result for Bookflow is more specific: when vertical scrolling was required, paper had a reliable advantage over digital devices; when scrolling was not required, differences between paper and digital devices were small or not reliable. The authors discuss place-on-the-page tracking, screen size, eye strain, cognitive load, and overconfidence as plausible mechanisms, while also noting that the evidence is mainly about controlled expository reading and should not be generalized to every genre or user. [web:4]

Therefore, do not write product copy saying “screen reading is always bad” or “Bookflow scientifically fixes comprehension.” The accurate claim is:

> Bookflow reduces avoidable digital-reading friction by replacing uncontrolled scrolling with stable chunks or paginated views, preserving location cues, improving typography, and adding optional comprehension support.

## 4. Bookflow's reading model

### 4.1 Default modes

Offer three modes rather than forcing one reading philosophy.

| Mode | Best for | Behavior |
| --- | --- | --- |
| Focus flow | Continuous prose | One sentence or paragraph receives a gentle focus rail; the rest remains visible and accessible. |
| Book pages | Users who dislike scrolling | Render stable page-sized chunks with previous/next controls and keyboard/touch navigation. |
| Original document | Tables, figures, equations, layout-sensitive PDFs | Show the original PDF canvas/text layer with search and annotations. |

The default should be **Focus flow** for prose and **Original document** when the file contains dense tables, equations, or layout-sensitive content. Detecting this automatically should be advisory, not irreversible.

### 4.2 Preserve place on the page

Do not build the core reader as one endlessly scrolling text wall. Maintain stable reading anchors:

- Book, chapter, unit, paragraph, sentence, and page identifiers.
- A visible current-chapter label.
- A page or chunk counter such as `Chapter 3 · 4 of 12`.
- A progress marker that does not move when the user opens a note.
- A “return to last reading position” action.
- A compact two-page or one-page layout on wide screens.
- Horizontal pagination or chunk advancement as the recommended alternative to continuous scroll for long expository text.

The user can still scroll inside a chunk if needed. The design should reduce uncontrolled scrolling, not ban scrolling.

## 5. Progressive loading: GTA V analogy, correct architecture

The correct analogy is not “load only the text currently visible and forget the rest.” A book needs global metadata for navigation, progress, and search. Instead, use a **manifest plus demand-loaded units**.

### 5.1 Data layers

```text
Book manifest
  -> metadata, file kind, page/unit count, chapter labels, byte ranges if available

Structural index
  -> unit IDs, titles, word counts, estimated time, text availability, OCR status

Content chunks
  -> normalized text and optional layout data for selected units

Heavy assets
  -> page images, OCR boxes, figures, annotations, semantic indexes
```

### 5.2 Unit lifecycle

Each unit should have an explicit state:

```text
UNSEEN -> QUEUED -> PROCESSING -> READY -> FAILED -> RETRYING
```

For a reader at unit `n`:

- Render the current unit immediately if available.
- Preload `n + 1` and optionally `n + 2` with low priority.
- Keep `n - 1` cached for quick back navigation.
- Cancel OCR for units that are far outside the reading window.
- Persist completed OCR results in OPFS or IndexedDB, not only React state.
- Keep a small LRU cache so large books do not remain fully decoded in memory.

Use a bounded worker pool. The existing project guidance proposes a maximum of eight parallel workers based on hardware concurrency; for mobile, start lower and measure. Do not run OCR for all pages with `Promise.all`, because that is likely to create memory spikes.

### 5.3 PDF-specific loading

PDF.js exposes page-level rendering and text extraction. Use `getPage(pageNumber)`, `render()`, and `getTextContent()` per page rather than extracting and rendering the entire document synchronously. For network-hosted PDFs, range transport can support byte-range loading; for a user-selected local `File`, the browser still has access to the full file but should decode and OCR pages incrementally. [web:21][web:24]

Suggested preload window:

```js
const PRELOAD_BEFORE = 1;
const PRELOAD_AFTER = 2;
const MAX_ACTIVE_OCR = Math.min(3, Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) / 2)));
```

These numbers are starting points, not universal truths. Instrument memory, latency, cancellation, and mobile battery before changing them.

## 6. Recommended OCR strategy

### 6.1 Final recommendation

Use a tiered local-first OCR pipeline:

```text
Tier 0: Native PDF text extraction
  -> if the page has a reliable text layer, do not OCR it

Tier 1: Browser fallback
  -> Tesseract.js in a Web Worker for small, offline, zero-backend deployments

Tier 2: Optional local or self-hosted acceleration
  -> PaddleOCR PP-OCRv6 small/medium pipeline through the FastAPI backend

Tier 3: Optional server/high-accuracy route
  -> PP-OCRv6 server model or a configured vision model only after explicit consent
```

For Bookflow's stated goal of free end-to-end Windows and mobile support, **Tesseract.js is the baseline compatibility path; PaddleOCR PP-OCRv6 small/medium is the recommended high-quality accelerated path for Windows/local backend or self-hosted deployment.** Do not make a remote Hugging Face vision model the default. It is slower to operate, creates privacy and cost concerns, and is unnecessary for ordinary printed book pages.

### 6.2 Why not use only Tesseract.js?

Tesseract.js runs Tesseract through WebAssembly in browser or Node environments, making it attractive for privacy and zero-server deployment. It is easy to distribute, but it is not a complete document-understanding pipeline: preprocessing, page segmentation, columns, rotation, reading order, and model download size still matter. It should be a reliable fallback, not your only accuracy promise. [web:10]

### 6.3 Why PaddleOCR PP-OCRv6 small/medium?

The official PaddleX documentation describes a pipeline containing text detection and recognition, with optional orientation and image-correction modules. Its published benchmark lists PP-OCRv6 small/medium detection and recognition models with competitive accuracy, with lower storage and CPU costs than the server variants. These are vendor benchmark figures on their stated datasets and hardware, not a guarantee for Bookflow's documents. [web:5]

For English and Latin-script books, select the appropriate Latin/English recognition model after testing. For Indonesian, a Latin model is usually the relevant starting point, but validate punctuation, diacritics, footnotes, two-column pages, and mixed English-Indonesian pages on your own corpus.

### 6.4 OCR quality pipeline

For every OCR page:

1. Render at a controlled resolution, usually around 200–300 DPI equivalent for printed pages.
2. Detect orientation only when the page needs it; do not pay the cost on every clean native page.
3. Convert to grayscale and apply conservative contrast/binarization only when needed.
4. Run text detection and recognition.
5. Sort boxes by reading order using coordinates, with a column-aware algorithm.
6. Reconstruct paragraphs from line proximity and indentation.
7. Remove repeated headers and footers only when the repetition is confidently detected.
8. Preserve page and bounding-box provenance.
9. Store confidence per line and page.
10. Send low-confidence pages to a retry path with altered preprocessing or optional higher-quality OCR.

Never silently discard low-confidence text. Show `OCR needs review` and keep the original page image available.

### 6.5 OCR result contract

Extend the current normalized contract without breaking it:

```ts
interface OcrPage {
  pageNumber: number;
  status: 'native' | 'ocr-ready' | 'processing' | 'ready' | 'failed';
  text: string;
  paragraphs: OcrParagraph[];
  meanConfidence: number | null;
  modelUsed: string | null;
  sourceHash: string;
  error: string | null;
}

interface OcrParagraph {
  id: string;
  text: string;
  bbox: [number, number, number, number] | null;
  confidence: number | null;
  sourcePage: number;
  sourceLineIds: string[];
}
```

The current API already models single-image, batch, and PDF OCR responses with page text, paragraphs, model, latency, success, and error. Add status, confidence, source hash, cancellation, and retry metadata rather than replacing the existing response shape.

## 7. Windows and mobile deployment

### Windows

Support two modes:

- Browser-only PWA: PDF.js plus Tesseract.js; no installation beyond the browser.
- Local accelerator: Bookflow frontend calls a locally running FastAPI/PaddleOCR service through `127.0.0.1`, with an explicit user action and a visible privacy explanation.

The local accelerator can be packaged later with Docker Desktop, a Python launcher, or a desktop shell. Do not make Docker a prerequisite for ordinary users.

### Mobile

The simplest free mobile path is a PWA using browser OCR, but mobile OCR is CPU- and battery-intensive. Use one worker at a time initially, render only the next few pages, cap image dimensions, pause processing when the tab is hidden, and provide a `Wi-Fi only` or `process while charging` preference.

For a native Android/iOS app, consider a platform OCR bridge later, but do not create a second product architecture before the browser flow is validated. The existing browser-first project can become a PWA before native packaging.

### Local file storage

The File System API can interact with user-selected files and OPFS provides an origin-private storage area optimized for persistent application data. File handles can be serialized into IndexedDB, but support and permission behavior must be feature-detected. Always provide a fallback using the ordinary File API and manual re-import. [web:19]

Recommended storage split:

| Data | Storage |
| --- | --- |
| Settings and small progress records | localStorage or IndexedDB |
| Parsed manifest and compact structural index | IndexedDB |
| OCR text chunks and page images | OPFS when available, IndexedDB fallback |
| User annotations and corrections | IndexedDB, exportable JSON |
| Original user file | Keep as a user-selected handle when possible; do not silently duplicate huge files |

Do not assume every browser offers the same quota or File System Access support.

## 8. Features that improve reading time without manipulation

### 8.1 Start friction reduction

- Import a file and immediately show title, estimated total time, and a one-minute first chunk.
- Ask one setup question: `Read for understanding`, `Read for completion`, or `Skim for reference`.
- Offer `Start at detected main body`, but never hide front matter.
- Resume at the last meaningful paragraph, not merely the last scroll pixel.
- Provide a one-click `Continue reading` card.

### 8.2 Attention support

- Focus rail at the existing `FOCUS_RAIL_RATIO = 0.42`.
- Gentle sentence or paragraph highlighting, never aggressive flashing.
- Distraction-free reader shell with optional full-screen mode.
- `Do not disturb while reading` is a user-controlled option; Bookflow cannot control the operating system without permission.
- Pause notifications only in a native integration and only with explicit consent.
- Respect reduced-motion preferences.

### 8.3 Comprehension support

- End-of-chunk recall prompt: `What was the main point?` with no grade by default.
- Optional one-sentence self-summary.
- Highlight-to-note and quote provenance.
- Chapter map with concepts or headings, not an AI-generated answer presented as fact.
- `Look back` drawer showing the previous few paragraphs without losing the current location.
- Definitions from a user-invoked dictionary or local glossary.
- Optional AI explanation that sends only the selected text, with a clear privacy confirmation.
- A `confusion marker` that lets users mark a paragraph to revisit later.

Avoid automatic summaries that encourage users to skip the book. If an AI summary exists, label it as a reading aid and put the original text one click away.

### 8.4 Motivation and progress

Use deterministic progress and meaningful completion:

- Chapter completion.
- Reading minutes chosen by the user.
- Number of sessions, not a punitive streak.
- A calm progress ring.
- Milestones such as `first chapter completed` or `five pages revisited`.
- Session history stored locally.
- End-of-session reflection: `Continue`, `save position`, or `stop here`.

Do not use variable-ratio rewards. A Spotify-like feeling should come from polished transitions, immediate continuation, saved context, and personalized shelves—not from random rewards.

Gated optional polish (opt-in, default off, never blocking reading): chapter-complete capsules, flow sparklines, retention modals, and horizon teasers. All must respect reduced-motion and use neutral, non-manipulative copy.

### 8.5 Accessibility and ergonomics

- Atkinson Hyperlegible and OpenDyslexic as options, not assumptions.
- Adjustable font size, line height, column width, contrast, warmth, and focus strength.
- Text-to-speech with sentence synchronization where browser support allows.
- Keyboard controls and touch controls.
- High-contrast mode, visible focus outlines, labels for screen readers.
- No horizontal overflow between 320px and 430px widths.
- A page/chunk mode that minimizes continuous movement.

## 9. Apple Books-like features, applied carefully

The useful model is not copying Apple's branding or proprietary implementation. Implement equivalent user-facing concepts for the entire imported book:

- Search across native and OCR text.
- Bookmarks attached to stable paragraph/page IDs.
- Highlights and notes attached to quotes and source locations.
- Table of contents and chapter navigation.
- Reading themes and typography controls.
- Progress and estimated time remaining.
- Recent position restoration.
- Text-to-speech or read-aloud support where available.
- Export/import of annotations.

The crucial difference is that Bookflow should make these features operate on a normalized whole-book model, while retaining original-page provenance for auditability.

## 10. Three.js: useful role and limits

Three.js should support the product atmosphere, not the book-rendering pipeline.

Good uses:

- A subtle library shelf or ambient landing visual.
- A calm book-opening transition.
- A progress visualization or chapter constellation that can be disabled.
- A lightweight “reading room” background on capable desktop devices.

Bad uses:

- Rendering every page as a 3D plane.
- Putting the main text into WebGL, which harms selection, accessibility, search, and screen readers.
- Running a permanent high-cost animation behind the reader.
- Adding 3D effects to every scroll event.

Keep book text in semantic HTML/React. Mount Three.js only when visible, pause it when hidden or when the reader enters focus mode, cap device pixel ratio, and respect `prefers-reduced-motion`. Use a no-WebGL fallback that looks complete rather than broken.

## 11. Dependency decisions

### Keep and use

| Dependency or subsystem | Purpose | Recommendation |
| --- | --- | --- |
| React + Vite | UI and build | Keep. Preserve feature boundaries. |
| Zustand | Reader/UI state | Keep. Persist compact state only. |
| PDF.js | PDF rendering and native text | Keep. Use page-level lazy work. |
| JSZip | EPUB package parsing | Keep. Sanitize and validate archive entries. |
| Tesseract.js | Browser OCR fallback | Keep, but run in workers and lazy-load language data. |
| FastAPI/Uvicorn | Optional local accelerator | Keep as an optional service. |
| PaddleOCR | High-quality local OCR route | Prefer PP-OCRv6 small/medium first; benchmark on Bookflow corpus. |
| Framer Motion | UI transitions | Keep only for low-cost transitions; disable or reduce motion when requested. |
| Three.js | Ambient/progressive visual layer | Keep isolated from text reader. |
| IndexedDB/OPFS | Large local data | Add an explicit storage adapter rather than scattering calls through components. |

### Do not add yet

- A vector database for ordinary local books.
- A cloud OCR provider as the default.
- A heavy LLM for chapter structure or every-page OCR.
- A gamification SDK.
- A full PDF editor.
- A native mobile rewrite before the PWA path is stable.

Add dependencies only after measuring a real limitation and documenting the reason, license, bundle cost, and fallback.

## 12. Proposed architecture changes

```text
src/features/document-import/
  parsers/
    pdfParser.js
    epubParser.js
    textParser.js
  ocr/
    ocrScheduler.js
    tesseractWorker.js
    ocrCache.js
    ocrQuality.js
  storage/
    documentStore.js
    opfsAdapter.js
    indexedDbAdapter.js

src/features/reader/
  components/
    ReaderPage.jsx
    BookChunk.jsx
    PaginationControls.jsx
    LookbackDrawer.jsx
    SessionBar.jsx
  lib/
    readingWindow.js
    progressModel.js
    paragraphAnchors.js
    readingPolicy.js

src/features/reading-session/
  sessionStore.js
  sessionMetrics.js
  sessionPrompts.jsx

backend/app/
  routers/ocr.py
  services/native_pdf.py
  services/paddle_ocr.py
  services/job_manager.py
  schemas/ocr.py
```

The repository currently documents feature-local boundaries. Follow them. Do not put OCR scheduling, storage, and reading-session logic into `App.jsx`.

## 13. Coding plan for AI agents

### Phase 0: Baseline and safety

- Read `AGENTS.md`, `api.md`, `book-structure-algorithm.md`, and neighboring source files before editing.
- Run lint, tests, frontend build, and backend tests.
- Add a representative fixture set: native PDF, scanned PDF, EPUB, two-column PDF, image-heavy PDF, Indonesian Latin text, and a long book.
- Record baseline import time, first-content time, memory peak, OCR accuracy sample, and mobile behavior.

### Phase 1: Fix loading behavior

- Replace all-document eager processing with a manifest-first import.
- Add a `documentJobId` and cancellation token to parsing/OCR jobs.
- Create a bounded scheduler with priority: current unit, next unit, previous unit, background units.
- Persist each completed unit atomically.
- Show partial readiness in the UI without pretending the whole document is finished.

### Phase 2: Strengthen the OCR pipeline

- Detect native PDF text quality before OCR.
- Add Tesseract.js worker fallback with lazy language data.
- Route optional acceleration to PaddleOCR PP-OCRv6 small/medium.
- Preserve OCR boxes, confidence, model, latency, and source page.
- Add retry and low-confidence review controls.
- Test column ordering and repeated header/footer removal.

### Phase 3: Build stable reading chunks

- Introduce `readingWindow` that keeps current, previous, and next units.
- Add page/chunk mode and keyboard/touch advancement.
- Maintain focus on stable paragraph IDs rather than DOM index alone.
- Add look-back without changing the current anchor.
- Keep original-document mode for layout-dependent material.

### Phase 4: Add responsible motivation

- Resume card.
- Chosen session goal.
- Deterministic progress.
- End-of-chunk recall prompt.
- Completion and stop controls.
- Local-only session metrics with export/delete controls.

### Phase 5: Three.js polish

- Lazy-mount ambient visuals outside the core reader.
- Add reduced-motion and low-power fallbacks.
- Measure frame rate and memory on a low-end phone.
- Never block the first readable text on WebGL initialization.

### Phase 6: Validation and release

- Test with screen readers, keyboard, touch, reduced motion, offline mode, private browsing limitations, and low-memory mobile devices.
- Verify that books remain local by default and that remote OCR requires an explicit action.
- Publish measured performance and OCR accuracy on legally usable fixtures.
- Do not claim psychological improvement, addiction, or comprehension gains until tested in a controlled user study.

## 14. API and state changes

Add these concepts to the existing API contracts:

```json
{
  "documentId": "filename:size:lastModified:hash",
  "manifestVersion": "1.0.0",
  "units": [
    {
      "id": "page-12",
      "kind": "PDF_PAGE",
      "label": "Page 12",
      "wordCount": 481,
      "estimatedSeconds": 131,
      "textStatus": "ready",
      "ocrStatus": "native",
      "sourcePage": 12
    }
  ],
  "readingAnchor": {
    "unitId": "page-12",
    "paragraphId": "paragraph-12-2",
    "sentenceIndex": 4,
    "progress": 0.37
  }
}
```

Use a schema version. Migration must preserve existing `notes`, `bookmarks`, `progress`, and `scrollTop`. When a parser revision changes paragraph boundaries, map anchors by source page plus normalized quote hash where possible; otherwise ask the user to choose a nearby location.

## 15. Performance acceptance targets

These are engineering targets, not scientific claims:

| Metric | Initial target |
| --- | --- |
| Time to visible import UI | Under 1 second after file selection on a normal laptop |
| Time to first readable native-text unit | Under 2 seconds for a representative local PDF |
| Time to first OCR unit | Show progress immediately; target under 5 seconds on a normal laptop for a clean page |
| UI responsiveness during OCR | No long main-thread block; scrolling and cancel remain usable |
| Memory | No full-book decoded page-image retention; bounded cache |
| Mobile battery | Pause or reduce OCR when hidden, low-power, or user-disabled |
| Navigation | Previous/current/next units available without reprocessing |
| Data loss | No lost annotation after reload or failed background job |

Benchmark on actual devices. Do not infer mobile performance from a desktop development server.

## 16. Evaluation plan

Create a legally usable corpus with at least 30–50 documents for the first engineering gate, then expand it before making quality claims. Include native PDFs, scans, books with two columns, tables, headers, footers, page numbers, Indonesian text, English text, mixed languages, figures, and poor scans.

Measure:

- Character error rate and word error rate against human transcription for OCR samples.
- Paragraph boundary agreement.
- Reading-order accuracy.
- Native-text detection precision and recall.
- Time to first readable unit.
- Cancellation success rate.
- Memory peak during long-book import.
- First-content latency on low-end mobile.
- Annotation persistence.
- Comprehension outcomes only in a separate user study.

Use a fail-safe: if OCR or structure confidence is low, keep the original page visible, preserve navigation, and use soft focus rather than suppressing content.

## 17. No-bullshit product claims

Allowed:

- “Reads your supported files locally by default.”
- “Turns supported documents into a more focused, adjustable reading experience.”
- “Processes scanned pages progressively instead of blocking on the entire book.”
- “Uses native PDF text when available and OCR when needed.”
- “Optional local OCR acceleration is available.”

Not allowed without evidence:

- “Makes you addicted.”
- “Guarantees better comprehension.”
- “Eliminates eye strain.”
- “Understands every PDF perfectly.”
- “OCR is 100% accurate.”
- “AI knows where the real book starts.”

## 18. Priority backlog

### P0: Must build first

- Manifest-first progressive import.
- Native text detection before OCR.
- Cancellable bounded OCR queue.
- Stable unit and paragraph anchors.
- Paginated/chunked reading mode.
- OPFS/IndexedDB storage adapter with fallback.
- OCR confidence and failure UI.
- Tests for long books and scanned PDFs.

### P1: High value

- Tesseract worker fallback cleanup.
- PaddleOCR PP-OCRv6 small/medium local accelerator.
- Look-back drawer.
- Resume card and deterministic session goals.
- Recall prompts and notes.
- Text-to-speech synchronization.
- Import/export annotations.

### P2: Polish

- Three.js ambient library or transition.
- Chapter progress visualization.
- Optional local semantic search.
- Device-specific performance tuning.
- Native mobile wrapper after PWA validation.

## 19. Definition of done

Bookflow is ready for a meaningful beta when:

- A user can import a native or scanned book and read the first usable unit without waiting for full-book processing.
- The current unit, previous unit, and next unit are navigable and cached.
- OCR is local by default, optional acceleration is explicit, and failures are visible.
- The reader supports stable chunks, original layout, notes, bookmarks, search, progress, and resume.
- No book text is inserted through `dangerouslySetInnerHTML`.
- Three.js never blocks readable text and has a no-WebGL fallback.
- Desktop and mobile have no horizontal overflow.
- Lint, unit tests, integration tests, production build, and backend tests pass.
- Benchmarks document actual latency, memory, OCR quality, and device coverage.
- Any claim about improved comprehension or longer reading time is supported by a user study rather than product intuition.

## 20. Final recommendation

Build Bookflow as a local-first progressive document reader, not as an AI chatbot wrapped around a PDF. Keep the current React/PDF.js/Tesseract/FastAPI foundation, add a manifest and bounded unit scheduler, make paginated or chunked reading the antidote to uncontrolled scrolling, and use PaddleOCR PP-OCRv6 small/medium as the optional self-hosted accelerator while retaining Tesseract.js for browser-only fallback. Use Three.js for atmosphere only. The best “Spotify or Netflix feeling” will come from instant continuation, polished transitions, clear progress, reliable caching, and meaningful personalization—not from manipulative reward mechanics.

## Sources

- Digital reading meta-analysis: https://link.springer.com/article/10.1007/s10639-025-13843-8
- PaddleX OCR pipeline documentation: https://paddlepaddle.github.io/PaddleX/3.2/en/pipeline_usage/tutorials/ocr_pipelines/OCR.html
- MDN File System API: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- PDF.js rendering and text extraction API reference: https://tessl.io/registry/tessl/npm-pdfjs-dist/5.4.0/files/docs/rendering-api.md
- PDF.js text layer reference: https://tessl.io/registry/tessl/npm-pdfjs-dist/5.4.0/files/docs/text-layer.md
- Tesseract.js overview: https://tessl.io/registry/tessl/npm-tesseract-js/6.0.0/files/docs/index.md
