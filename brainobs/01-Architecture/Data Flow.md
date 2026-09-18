---
title: Data Flow
type: concept
status: verified
updated: 2026-09-18
tags: [bookflow, architecture, dataflow]
source-files: [src/App.jsx, src/features/document-import/lib/importCoordinator.js, src/features/document-import/lib/backendOcrFallback.js, backend/main.py, src/features/reader/hooks/useReaderPersistence.js]
---

# Data Flow

The complete journey of a book through Bookflow, from file selection to restored position.

## Stage map

```text
1  Select        User picks or drops a file on the landing page
2  Validate      Extension and 50 MB ceiling checked before any parsing
3  Route         Format decides the parser: PDF, EPUB, TXT, Markdown
4  Parse/OCR     Progressive units, or backend scan when the browser cannot read pages
5  Normalize     Every path emits NormalizedBook { title, author, kind, chapters[] }
6  Enrich        App builds a flat paragraph list with paragraph-{chapter}-{index} ids
7  Render        ReaderPage renders React text nodes in reading sections
8  Focus         Scroll rail selects the active paragraph at 42 percent viewport height
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
| EPUB | `progressiveEpubImport` |
| TXT | `progressiveTextImport` |
| Markdown | `progressiveTextImport` |

## Stage 4: progressive import

`documentManifest.js` creates a manifest right after validation. Each unit is a PDF page, an
EPUB spine item, or a text section, and moves through:

```text
UNSEEN -> QUEUED -> PROCESSING -> READY | FAILED
                              -> CANCELLED
```

`importScheduler.js` drains the queue with bounded concurrency and per-unit
`AbortController`. Priority is `CURRENT(0) > NEXT(1) > PREVIOUS(2) > BACKGROUND(3)`.

The important user-visible property: the first ready unit opens the reader immediately. The
rest stream in behind it in source order. The user never waits for a whole book.

Detail: [[Import Scheduler]].

## Stage 4b: fallback ladder

If local parsing cannot read the document, control moves outward:

```text
native PDF text
  -> local Tesseract.js on image-only pages
    -> backend scan via scanPdfViaBackend
      -> clear error surfaced to the user
```

`isBackendFallbackError(error)` inspects the message for the accelerated-scan hint and routes
accordingly. Progress callbacks keep the user informed at every rung, including the explicit
notice that the file is being uploaded and can be cancelled.

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

Two layers, deliberately separate:

| Layer | Key | Contents |
| --- | --- | --- |
| Global settings | `bookflow-reader-storage` | Reader preferences only |
| Per-document session | `bookflow:document:{id}` | progress, chapter, pinned id, bookmarks, notes, scrollTop |

Document identity is `filename:size:lastModified`, so a renamed or edited file is treated as a
new document rather than silently loading the wrong state.

Detail: [[Storage and Persistence]].

## Stage 10: restore

`useReaderPersistence` reads the session for the current identity on open, restores progress,
chapter, pin, bookmarks, notes, and scroll position, and writes changes back with debouncing.

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
bookflow:reader-mounted      first render after openBook()
```

Read them with `performance.getEntriesByType('measure')` filtered by the `bookflow:` prefix.
These feed the targets in [[Success Metrics]].