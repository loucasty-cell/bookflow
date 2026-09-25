---
title: Data Flow
type: concept
status: verified
updated: 2026-09-25
tags: [bookflow, architecture, dataflow]
source-files: [src/App.jsx, src/features/document-import/hooks/useDocumentImport.js, src/features/document-import/lib/importCoordinator.js, src/features/document-import/lib/backendOcrFallback.js, src/features/document-import/components/OcrUploader.jsx, src/features/document-import/hooks/useOcrSession.js, backend/main.py, src/features/reader/hooks/useReaderPersistence.js, tests/e2e/long-import.spec.js]
---

# Data Flow

The complete journey of a book through Bookflow, from file selection to restored position.

## Stage map

```text
1  Select        User picks or drops a file on the landing page
2  Validate      Extension and 50 MB ceiling checked before any parsing
3  Route         Format decides the parser: PDF, EPUB, TXT, Markdown
4  Parse/OCR     Progressive local units, or an explicitly started backend scan for difficult scans
5  Normalize     Every path emits NormalizedBook { title, author, kind, chapters[] }
6  Enrich        App builds a flat paragraph list with paragraph-{chapter}-{index} ids
7  Render        ReaderPage renders React text nodes in reading sections
8  Focus         Scroll rail selects the active paragraph at 38 percent viewport height
9  Persist       Settings globally, session state per document identity
10 Restore       Reopening the same file restores progress, bookmarks, notes, scroll
```

## Stage 1 to 3: selection and routing

`LandingPage` handles drag-and-drop and file input. `App.handleFile` validates, sets loading
state, and chooses a path. Small metadata is recorded immediately through
`bookflow:import-selected` and `bookflow:validation-done` performance marks.

Routing rule:

| Format | Path |
| --- | --- |
| PDF | `progressivePdfImport` when `settings.useProgressiveImport !== false` |
| EPUB | `parseDocument` in the current `handleFile`; `progressiveEpubImport` is exposed but not wired |
| TXT | `parseDocument` in the current `handleFile`; `progressiveTextImport` is exposed but not wired |
| Markdown | `parseDocument` in the current `handleFile`; `progressiveTextImport` is exposed but not wired |

## Stage 4: progressive import

`documentManifest.js` creates a manifest right after validation. The progressive PDF coordinator
schedules one unit per page. The EPUB and text coordinators can create spine-item or section
units, but the current app routes those formats through blocking `parseDocument`. Units move
through:

```text
UNSEEN -> QUEUED -> PROCESSING -> READY | FAILED
                              -> CANCELLED
```

`importScheduler.js` drains the queue with bounded concurrency and per-unit
`AbortController`. Priority is `CURRENT(0) > NEXT(1) > PREVIOUS(2) > BACKGROUND(3)`.

The first ready PDF unit is an internal readiness signal, not a reader-open signal. The app starts
at `5%`, clamps in-progress updates to `1-99%`, waits for the coordinator's terminal completion,
requires a `100` terminal state, and only then calls `setBook` and `openBook`. The reader is never
mounted pre-terminal. EPUB, TXT, and Markdown remain blocking until their progressive coordinators
are wired into `handleFile`.

The measured browser probe on 2026-09-25 used a selectable-text 420-page PDF at `390 x 844`:
progress was observed from `5 → 100`, `.app-shell` appeared afterward, horizontal overflow was
`0`, exactly `2` reading sections were mounted, and the elapsed probe time was `3,847 ms` (about
`3.7 s`). This is one representative run, not a universal performance guarantee.

Detail: [[Import Scheduler]].

## Stage 4b: explicit OCR choice

The default path never contacts the backend:

```text
native PDF text
  -> local Tesseract.js on image-only pages
    -> clear local error if no readable text is recovered
```

The user can then choose `Optional accelerated OCR` and explicitly start `scanPdfViaBackend`.
Only that action uploads the PDF to the configured backend. The backend may use its configured
PaddleOCR and Hugging Face provider chain after the upload; provider failover inside that
started job is not an automatic frontend fallback.

`isBackendFallbackError(error)` identifies the local error hint, but the current import hook does
not call the backend automatically. Progress callbacks disclose the explicit upload and provide a
cancel action.

Detail: [[OCR Decision Tree]], [[OCR-Frontend Sync Contract]].

## Stage 5: normalization

Both the browser and the server emit the same contract, so downstream code is origin-agnostic.

```json
{
  "title": "Document Title",
  "author": "Author or null",
  "kind": "PDF | EPUB | TEXT | MARKDOWN",
  "chapters": [
    { "title": "Chapter 1", "focusEligible": true, "paragraphs": ["..."], "subheadings": [] }
  ]
}
```

Backend OCR adds `ocrPageCount`, `totalWords`, and `skippedPages` while keeping the core
shape intact. Chapters are labelled `Page N`.

Detail: [[Normalized Book Contract]].

## Stage 6: enrichment

`App.jsx` flattens chapters into an enriched paragraph list:

```json
{ "id": "paragraph-0-0", "text": "...", "chapterIndex": 0, "paragraphIndex": 0 }
```

Ids are stable within a parse and ordered by document position. They are the anchors used by
bookmarks, notes, and the focus rail. Word count and reading time are computed here, using
230 words per minute for time estimates.

## Stage 7 to 8: rendering and focus

`ReaderPage` renders each chapter as `.reading-section` blocks containing paragraph elements.
While the reader scrolls, `useReaderNavigation` computes:

```text
anchorY = reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO
```

and calls `selectClosestParagraph` to pick the active unit. Static regions (intros, end matter)
are detected and scroll natively, showing a small reading label instead of snapping.

Detail: [[Focus Rail]], [[Navigation and Controls]].

## Stage 9: persistence

Three durable metadata layers, deliberately separate:

| Layer | Key | Contents |
| --- | --- | --- |
| Global settings | `bookflow-reader-storage` | Reader preferences only |
| Per-document session | `bookflow:document:{id}` | progress, active paragraph, bookmarks, notes, scrollTop |
| Library metadata | `bookflow:library` | title, author, progress, shelf, measured session totals |

The library layer never contains document text.

Document identity is `filename:size:lastModified`, so a renamed or edited file is treated as a
new document rather than silently loading the wrong state.

Detail: [[Storage and Persistence]].

## Stage 10: restore

`useReaderPersistence` reads the session for the current identity on open, restores progress,
active paragraph, bookmarks, notes, and scroll position, and writes changes back with debouncing.
The current pin and chapter selection are transient reader state, not persisted session fields.

Known limitation: re-parsing a changed Markdown or EPUB file can shift paragraph indices and
orphan existing annotations for that document. The imported text is never deleted.

## Timing and observability

```text
bookflow:import-selected     file chosen
bookflow:validation-done     type confirmed
bookflow:native-text-done    PDF native extraction complete
bookflow:ocr-start           local Tesseract begins
bookflow:ocr-done            local Tesseract ends
bookflow:chapters-done       chapters assembled
bookflow:reader-mounted      first render after terminal import and openBook()
```

Read them with `performance.getEntriesByType('measure')` filtered by the `bookflow:` prefix.
These feed the targets in [[Success Metrics]].