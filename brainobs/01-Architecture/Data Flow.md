---
title: Data Flow
type: concept
status: verified
updated: 2026-10-02
tags: [bookflow, architecture, dataflow]
source-files: [src/App.jsx,src/features/document-import/hooks/useDocumentImport.js,src/features/document-import/lib/documentManifest.js,src/features/document-import/lib/importCoordinator.js,src/features/document-import/lib/importScheduler.js,src/features/document-import/lib/manifestToBook.js,src/features/document-import/lib/backendOcrFallback.js,src/features/document-import/hooks/useOcrSession.js,src/features/reader/lib/chapterEnrichment.js,src/features/reader/lib/readingController.js,src/features/reader/hooks/useReaderPersistence.js,backend/main.py,tests/e2e/long-import.spec.js]
---

# Data Flow

The complete journey of a book through Bookflow, from file selection to restored position.
Measured 2026-10-02.

## Stage map

```text
1  Select        User picks or drops a file, or opens a bundled sample or curated shelf book
2  Validate      Extension and 50 MB ceiling checked before any parsing
3  Route         Format decides the parser: PDF, EPUB, TXT, Markdown
4  Parse/OCR     Progressive local units, or an explicitly started backend scan for difficult scans
5  Normalize     Every path emits NormalizedBook { title, author, kind, chapters[] }
6  Enrich        A flat paragraph list with paragraph-{chapter}-{index} ids
7  Render        ReaderPage renders React text nodes in reading sections
8  Focus         The scroll rail selects the active paragraph at 38% viewport height
9  Persist       Settings globally; session state per document identity
10 Restore       Reopening the same file restores progress, bookmarks, notes, scroll
```

## Stage 1 to 3: selection and routing

`LandingPage` handles drag-and-drop and file input, and exposes `RecentShelf` plus the curated
`LivingShelf` books. `useDocumentImport.handleFile` validates, sets loading state, and chooses a
path. Small metadata is recorded immediately through `bookflow:import-selected` and
`bookflow:validation-done`.

Routing is decided at `useDocumentImport.js:334`:

```js
if (isPdf && useProgressiveImport !== false) {
  await openProgressivePdf(file, generation, controller.signal)
}
```

| Format | Path | Source |
| --- | --- | --- |
| PDF | `progressivePdfImport`, the manifest-first coordinator | `useDocumentImport.js:334-336` |
| EPUB | blocking `parseDocument` | `useDocumentImport.js:282` |
| TXT | blocking `parseDocument` | same |
| Markdown | blocking `parseDocument` | same |

`progressiveEpubImport` (line 506 of `importCoordinator.js`) and `progressiveTextImport` (line 648)
are exported from the document-import barrel and unit-tested, but `handleFile` does not call them.
All three are live public API; only the PDF coordinator is wired.

Three source paths lead to a book, and they all converge on the same contract:

| Source | Book producer |
| --- | --- |
| Bundled sample | `landing/sampleBook.js`, opened with the id `bookflow-sample` |
| Curated shelf book | `LivingShelf`, opened with the id `curated:{book.title}` |
| Imported file | `parseDocument`, `manifestToBook`, or `scanPdfViaBackend` |

## Stage 4: progressive import

`documentManifest.js` creates a manifest right after validation. Units move through:

```text
UNSEEN -> QUEUED -> PROCESSING -> READY | FAILED -> CANCELLED
                                  requeue -> UNSEEN
```

`UnitStatus` and `JobPriority` are frozen objects in `documentManifest.js:12-26`. Priority is
`CURRENT(0) > NEXT(1) > PREVIOUS(2) > BACKGROUND(3)`, so the page under the reader is always
processed before the page after it.

`importScheduler.js` drains the queue with bounded concurrency and a per-unit `AbortController`.
Concurrency (`importScheduler.js:14-20`):

| Environment | Concurrency |
| --- | --- |
| Mobile user agent | 1 |
| Desktop | `min(3, max(1, floor(hardwareConcurrency / 2)))` |
| No `navigator` | 2 |

### The terminal-state rule

The first ready PDF unit is an internal readiness signal, **not** a reader-open signal.
`useDocumentImport.js:228-231`:

```js
const terminalProgress = Number(handle.getProgress?.() ?? completion.progress ?? 0)
if (!Number.isFinite(terminalProgress) || terminalProgress < 100) {
  const error = new Error('Local import did not reach a complete terminal state.')
```

Progress is reported monotonically and clamped to `1-99` while in flight; `100` is reserved for
terminal. Only after the terminal state does the hook call `setBook` and open the reader.
**The reader is never mounted pre-terminal.** On failure the error carries `importTerminal = true`
so the progressive path is not silently retried.

`manifestToBook.js` then converts the manifest to the contract: it keeps only `READY` units that
have paragraphs, sorts by `sourcePage`, maps each unit to a chapter titled by its `label`, and sets
`ocrPageCount` from units whose `ocrStatus` is `"ocr-ready"`.

Measured browser probe on 2026-09-25 used a selectable-text 420-page PDF at `390 x 844`: progress
was observed from `5 -> 100`, `.app-shell` appeared afterward, horizontal overflow was `0`, exactly
`2` reading sections were mounted, and the elapsed probe time was `3,847 ms`. One representative
run, not a universal performance guarantee.

Detail: [[Import Scheduler]], [[PDF Parsing]], [[EPUB Parsing]].

## Stage 4b: the explicit OCR choice

The default path never contacts the backend:

```text
native PDF text
  -> local Tesseract.js on image-only pages
    -> a clear local error if no readable text is recovered
```

The user can then choose `Optional accelerated OCR` and start a scan. Only that action uploads the
PDF. `scanPdfViaBackend` (`backendOcrFallback.js:46`) is the seam:

```text
report 2% with the disclosure line
  POST {base}/api/ocr/scan       multipart: file, batch_size=16, ocr_profile="small"
  EventSource {base}/api/ocr/progress/{job_id}
    "initial"  -> terminal status, or first percent
    "progress" -> percent, page, running word total
    "completed"-> pages, total_words, failed_pages
    "error"    -> fail with the server message
  -> { title, author: "", kind: "PDF", chapters, ocrPageCount, totalWords, skippedPages }
```

Two details worth naming:

- Progress is clamped to `1-99` and monotonic (`reportProgress`, line 56). `100` never comes from
  the stream; only the local import path produces it.
- Cancel is available throughout. `cancel()` closes the `EventSource` and posts to
  `/api/ocr/cancel/{job_id}` so the backend releases its buffers. `SCAN_TIMEOUT_MS` is ten minutes.

`toChapters` (line 16) sorts pages numerically, skips any page that is not `success` or has no text,
de-duplicates repeated page numbers, and titles each chapter `Page N` with
`splitParagraphs(page.text)`.

`isBackendFallbackError(error)` matches `/accelerated backend scan may still read it/i`. It only
*identifies* a local error hint; the import hook never calls the backend because of it. Provider
failover inside a started job is internal to the backend and is not a frontend fallback.

Detail: [[OCR Decision Tree]], [[OCR-Frontend Sync Contract]], [[SSE Progress Streaming]].

## Stage 5: normalization

Every path emits the same contract, so downstream code is origin-agnostic. Detail:
[[Normalized Book Contract]].

| Producer | `author` | `focusEligible` | Extras |
| --- | --- | --- | --- |
| `parseDocument` | per parser | not set; computed at enrichment | none |
| `manifestToBook` | `manifest.author ?? ""` | not set; computed at enrichment | `ocrPageCount` |
| `scanPdfViaBackend` | `""` | not set; computed at enrichment | `ocrPageCount`, `totalWords`, `skippedPages` |
| `ocrResultToBook` | **`"Hugging Face OCR"`** | not set | `ocrPageCount`, `totalWords`, `skippedPages` |

`ocrResultToBook.js` is the one exception to the "author is never guessed" rule: it hardcodes the
string `"Hugging Face OCR"` as the author. That label describes the provider, not the writer. Worth
fixing before the field is shown to a reader.

## Stage 6: enrichment

`enrichChapters` in `src/features/reader/lib/chapterEnrichment.js` flattens the contract:

```json
{ "id": "paragraph-0-0", "text": "...", "chapterIndex": 0, "paragraphIndex": 0 }
```

Ids are `paragraph-{chapterIndex}-{paragraphIndex}`, assigned in document order. They are the
anchors used by bookmarks, notes, the focus rail, and progress restoration.

Enrichment is also where `focusEligible` is decided, from `isFocusEligibleChapter(chapter,
chapterIndex, sourceChapters.length)`. That is why no producer sets it.

`countBookWords` and `readingMinutes` live in the same module. `readingMinutes` uses
`Math.max(1, Math.ceil(totalWords / 230))` -- a fixed 230 words per minute, deterministic, and
distinct from the measured pace in `features/library/lib/readingSpeed.js`.

## Stage 7 to 8: rendering and focus

`ReaderPage` renders each chapter as `.reading-section` blocks containing paragraph elements as
React text nodes. It takes smooth scroll from `useReaderSmoothScroll`, so programmatic scroll goes
through Lenis rather than writing `container.scrollTop` directly.

While the reader scrolls, `useReaderNavigation` computes:

```text
anchorY = reader.scrollTop + reader.clientHeight * FOCUS_RAIL_RATIO     FOCUS_RAIL_RATIO = 0.38
```

and calls `selectClosestParagraph` to pick the active unit. Scroll intent is dampened by
`SCROLL_INTENT_THRESHOLD` 96 with `MAX_SCROLL_INPUT` 64 per event, and `LINE_COOLDOWN` 240 ms
between programmatic steps.

Static regions (intros, end matter) are detected and scroll natively, showing a small reading label
instead of snapping. On books above `LONG_BOOK_PARAGRAPH_THRESHOLD` 1500 paragraphs, `useChapterWindow`
keeps only a `WINDOW_RADIUS` of 1 chapter either side mounted, estimating `34` px per paragraph and
`170` px of chapter chrome for the spacers.

Detail: [[Focus Rail]], [[Navigation and Controls]], [[Sentence-Paced Scroll]].

## Stage 9: persistence

Three durable metadata layers plus a lens bar and notes UI preferences. Full inventory:
[[Storage and Persistence]].

| Layer | Key | Contents |
| --- | --- | --- |
| Global settings | `bookflow-reader-storage` | Reader preferences only. `partialize` excludes everything else |
| Settings mirror | `bookflow:settings` | The same settings object |
| Per-document session | `bookflow:document:{id}` | `progress`, `activeParagraphId`, `bookmarks`, `notes`, `scrollTop` |
| Notes fast path | `bookflow:quick-notes:{bookId}` | the notes array alone |
| Library metadata | `bookflow:library` | title, author, progress, shelf, measured session totals |

The library layer never contains document text.

Document identity is `filename:size:lastModified`, so a renamed or edited file is treated as a new
document rather than silently loading the wrong state.

`useReaderPersistence` writes twice: immediately when the notes array identity changes, and
throttled at 500 ms otherwise. Chapter selection and the current pin are transient reader state.

## Stage 10: restore

`useReaderPersistence` reads the session for the current identity on open, restores progress, active
paragraph, bookmarks, notes, and scroll position, and writes changes back.

`getResumeEntry` in `libraryStore.js` supplies the landing resume card: the most recently opened
entry that is on the `READING` shelf and below `FINISHED_PROGRESS` 98. The card asks the user to
re-select the file rather than reopening a file handle.

Known limitation, stated plainly: re-parsing a changed Markdown or EPUB file can shift paragraph
indices and orphan existing annotations for that document. The imported text is never deleted. An
open TODO (`improvements-gap-4`) proposes quote selectors plus a normalized quote hash to make
anchors survive re-parsing.

## Reading Lens egress, as a data flow

The only other place data crosses the boundary:

```text
selection -> composeLensPassage -> buildLensRequestBody (consent: true)
  -> POST /api/reading-lens, SSE
     start -> zero or more delta -> exactly one completed or error
  -> messages rendered in the lens bar
```

Without consent the flow stops one line earlier: `useReadingLens.js:563` returns
`buildLocalLensReply(passage, ...)` and `fetch` is never called. The backend independently 403s a
request with `consent` absent or false.

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

`src/shared/lib/perfMarks.js` namespaces every name with the `bookflow:` prefix and swallows
exceptions, so a missing `performance` API cannot break a read. Read them with
`performance.getEntriesByType('measure')` filtered by that prefix. These feed the targets in
[[Success Metrics]] and [[Focus Rail Performance]].

## Measured baseline, 2026-10-02

`npm test` 52 files / 506 tests passing. Playwright 19 tests across 4 specs, including the
420-page long-import spec. `pytest backend/tests` 75 passed. The Playwright suite runs against a
production preview build on port 4175, so a green browser run exercises the same bundle a user
would get.

Detail: [[Testing Pipeline]].