---
title: Import Scheduler
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, import, scheduler, performance]
source-files: [src/features/document-import/lib/importScheduler.js, src/features/document-import/lib/documentManifest.js, src/features/document-import/lib/importCoordinator.js, src/features/document-import/hooks/useDocumentImport.js, src/features/document-import/lib/manifestToBook.js, src/App.jsx, tests/e2e/long-import.spec.js]
---

# Import Scheduler

The mechanism that lets the PDF coordinator process a large book in bounded, cancellable units while
the app keeps a truthful terminal progress state.

Status: implemented and wired for PDFs only. `handleFile` routes PDFs through `progressivePdfImport`
when `settings.useProgressiveImport !== false`. The coordinator reports progress monotonically from
`5%`, the app waits for a terminal `100%` state, and only then opens the reader. An early ready unit
is an internal scheduling signal, not a pre-terminal reader mount. A non-terminal progressive failure
can fall back to blocking `parseDocument`.

EPUB, TXT, and Markdown currently use blocking `parseDocument`. Their progressive coordinators are
exported from the public API but are **not** wired into `handleFile`. Do not describe them as
progressive.

## Manifest

`createManifest` runs right after validation, before full parsing. Each unit is a PDF page, an EPUB
spine item, or a text section.

```json
{
  "documentId": "...",
  "manifestVersion": "1.0.0",
  "title": "Book",
  "author": null,
  "kind": "PDF",
  "totalUnits": 240,
  "createdAt": 1691823000000,
  "units": []
}
```

Each unit carries `id`, `label`, `sourcePage`, `kind`, `text`, `paragraphs`, `estimatedSeconds`,
`ocrStatus`, `status`, `confidence`, and `error`.

The manifest is the single source of truth for what is parsed, what needs OCR, and what is ready to
read. `manifestToBook.js` is the conversion step from a finished manifest to the normalized book
shape; it is not exported from the feature barrel.

## Unit lifecycle

```text
UNSEEN -> QUEUED -> PROCESSING -> READY
                               -> FAILED
        -> CANCELLED
```

Transition helpers guard against illegal moves: `markQueued` only acts on `UNSEEN`, `markCancelled`
only acts on `QUEUED` or `PROCESSING`, and `requeueUnit` returns a failed unit to the queue rather
than mutating it in place.

## Priority

```text
CURRENT(0) > NEXT(1) > PREVIOUS(2) > BACKGROUND(3)
```

The scheduler supports `jumpToUnit` and `cancelStale` for callers that retain a live handle: a
caller can reprioritise the current unit and drop unrelated work. The current app disposes the PDF
handle immediately after the terminal import and reader open, so there is no active background
import while the reader is scrolling, and `jumpToChapter` has nothing to reprioritise in practice.

## Concurrency

`getConcurrency()` at `importScheduler.js:15`:

```text
mobile device detected               -> 1
otherwise                            -> min(3, max(1, floor(hardwareConcurrency / 2)))
missing hardwareConcurrency          -> treated as 2 cores, which yields 1
```

Mobile gets 1 deliberately. Battery and memory matter more than throughput on a phone. Note the
fallback is *cores*, not a concurrency value: a missing `hardwareConcurrency` resolves to 2 cores
and therefore to concurrency 1, not to 2.

## Cancellation

Every running job holds an `AbortController`:

| Function | Effect |
| --- | --- |
| `cancelUnit(unitId)` | Aborts the active job and cancels a queued one |
| `cancelAll()` | Aborts everything and marks queued units cancelled |
| `cancelStale(currentUnitId)` | Cancels background jobs unrelated to the current position |
| `pause()` / `resume()` | Dispose or re-enable the drain loop |

Closing the book or re-importing cancels the active import, so work never continues in the background
after the reader has left.

## Scheduling behaviour

`enqueue` refuses to downgrade priority. If a unit is already queued at a higher priority, a
lower-priority enqueue is ignored. This prevents a background sweep from deprioritising the page the
reader is waiting for.

`stats()` reports active, queued, max concurrency, and total, which makes the scheduler observable
during performance work.

## Terminal 100% is enforced, not documented

`useDocumentImport.js` forces the reported progress to `100` only when the import is terminal
(`:118-122`), then holds `IMPORT_COMPLETE_DELAY = 480` ms (`:8`, applied at `:146`) before the
reader opens.

`tests/e2e/long-import.spec.js` is the standing proof. It synthesises a 420-page 612x792
native-text PDF with `pdf-lib` and asserts:

| Assertion | Why it matters |
| --- | --- |
| Progress reaches 100 before the reader mounts | No pre-terminal reader open |
| Progress is monotonic | No backwards progress bar |
| Horizontal overflow is 0 at 390x844 | Mobile stays usable |
| Mounted `.reading-section` count is at most 12 | The chapter window, not a 420-section DOM |

## Performance targets

| Metric | Target | Status |
| --- | --- | --- |
| Time to visible import UI | Under 1s after selection | Not measured in the current suite |
| Terminal import to reader | Monotonic progress, then visible 100% before open | Verified by the 420-page e2e test |
| Time to first OCR unit | Progress shown immediately | Not measured |
| Long task during OCR | None over 100ms | Not measured |
| Active OCR jobs | 1 to 3 by device class | Implemented |
| Memory | Bounded growth on long books | Not measured |

Say "not measured" rather than quoting a number from a single earlier probe. One measured run on one
machine is not a p50/p95 benchmark.

Wiring EPUB, TXT, and Markdown into the same coordinator remains open. The settings copy is not
evidence of a user-visible pre-terminal reader open.

Detail: [[Success Metrics]], [[Backlog P0-P1-P2]].

## Related

- [[Data Flow]] - where the scheduler sits in the pipeline
- [[PDF Parsing]] - what each unit does for PDFs
- [[OCR-Frontend Sync Contract]] - how backend scans integrate
- [[Frontend Public APIs]] - the exported manifest and scheduler surface