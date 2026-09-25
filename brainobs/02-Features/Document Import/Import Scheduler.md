---
title: Import Scheduler
type: feature
status: verified
updated: 2026-09-25
tags: [bookflow, import, scheduler, performance]
source-files: [src/features/document-import/lib/importScheduler.js, src/features/document-import/lib/documentManifest.js, src/features/document-import/lib/importCoordinator.js, src/features/document-import/hooks/useDocumentImport.js, src/App.jsx, scripts/bench.md, tests/e2e/long-import.spec.js]
---

# Import Scheduler

The mechanism that lets the PDF coordinator process a large book in bounded, cancellable units while
the app keeps a truthful terminal progress state.

Status: implemented and wired for PDFs. `handleFile` routes PDFs through `progressivePdfImport`
when `settings.useProgressiveImport !== false`. The coordinator reports progress monotonically from
`5%`, the app waits for a terminal `100%` state, and only then opens the reader. An early ready
unit is an internal scheduling signal, not a pre-terminal reader mount. A non-terminal progressive
failure can use blocking `parseDocument` as a safety path. EPUB, TXT, and Markdown currently use
blocking `parseDocument`; their progressive coordinators are exposed but not wired into the app path.

## Manifest

`createManifest` runs right after validation, before full parsing. Each unit is a PDF page, an
EPUB spine item, or a text section.

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

Each unit carries `id`, `label`, `sourcePage`, `kind`, `text`, `paragraphs`,
`estimatedSeconds`, `ocrStatus`, `status`, `confidence`, and `error`.

The manifest is the single source of truth for what is parsed, what needs OCR, and what is
ready to read.

## Unit lifecycle

```text
UNSEEN -> QUEUED -> PROCESSING -> READY
                              -> FAILED
       -> CANCELLED
```

Transition helpers guard against illegal moves. For example, `markQueued` only acts on
`UNSEEN`, and `markCancelled` only acts on `QUEUED` or `PROCESSING`.

## Priority

```text
CURRENT(0) > NEXT(1) > PREVIOUS(2) > BACKGROUND(3)
```

The scheduler supports `jumpToUnit` and `cancelStale` for callers that retain a live handle: a
caller can reprioritize the current unit and drop unrelated work. The current app disposes the PDF
handle immediately after the terminal import and reader open, so there is no active background
import while the reader is scrolling.

## Concurrency

`getConcurrency()`:

```text
no navigator            -> 2
mobile device detected  -> 1
otherwise               -> min(3, max(1, floor(hardwareConcurrency / 2)))
```

Mobile gets 1 deliberately. Battery and memory matter more than throughput on a phone.

## Cancellation

Every running job holds an `AbortController`:

| Function | Effect |
| --- | --- |
| `cancelUnit(unitId)` | Aborts the active job and cancels a queued one |
| `cancelAll()` | Aborts everything and marks queued units cancelled |
| `cancelStale(currentUnitId)` | Cancels background jobs unrelated to the current position |
| `pause()` / `resume()` | Dispose or re-enable the drain loop |

Closing the book or re-importing cancels the active import, so work never continues in the
background after the reader has left.

## Scheduling behaviour

`enqueue` refuses to downgrade priority. If a unit is already queued at a higher priority, a
lower-priority enqueue is ignored. This prevents a background sweep from deprioritizing the
page the reader is waiting for.

`stats()` reports active, queued, max concurrency, and total, which makes the scheduler
observable during performance work.

## Verified baseline

The 2026-09-25 browser probe used a 420-page selectable-text PDF at `390 x 844` and observed
progress from `5 → 100`. The reader appeared only after `100`, horizontal overflow was `0`, exactly
`2` reading sections were mounted, and the probe completed in `3,847 ms` (about `3.7 s`). This is
one measured run; it is not a p50/p95 benchmark.

## Performance targets

| Metric | Target | Status |
| --- | --- | --- |
| Time to visible import UI | Under 1s after selection | To measure |
| Terminal import to reader | Monotonic progress, then visible 100% before open | Verified in the 420-page probe |
| Time to first OCR unit | Progress shown immediately | To measure |
| Long task during OCR | None over 100ms | To measure |
| Active OCR jobs | 1 to 3 by device class | Implemented |
| Memory | Bounded growth on long books | To measure |

The PDF coordinator is the current progressive app path. Wiring EPUB, TXT, and Markdown into the
same coordinator remains open; the landing page must describe those formats as blocking until
`handleFile` routes them there. The current settings copy is not evidence of a user-visible
pre-terminal reader open.

Detail: [[Success Metrics]], [[Backlog P0-P1-P2]].

## Related

- [[Data Flow]] - where the scheduler sits in the pipeline
- [[PDF Parsing]] - what each unit does for PDFs
- [[OCR-Frontend Sync Contract]] - how backend scans integrate
- [[Frontend Public APIs]] - the exported manifest and scheduler surface