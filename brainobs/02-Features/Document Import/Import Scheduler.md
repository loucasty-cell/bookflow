---
title: Import Scheduler
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, import, scheduler, performance]
source-files: [src/features/document-import/lib/importScheduler.js, src/features/document-import/lib/documentManifest.js, src/features/document-import/lib/importCoordinator.js, scripts/bench.md]
---

# Import Scheduler

The mechanism that lets a reader start reading page one of a 600 page book immediately, and
lets them cancel the rest.

Status: implemented and wired. `handleFile` routes PDFs through `progressivePdfImport` when
`settings.useProgressiveImport !== false`, opens the first ready unit at once, streams the rest
in source order, and falls back to blocking `parseDocument` if progressive import fails.

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

The unit the reader is looking at is processed first, then nearby units, then the rest. When a
reader jumps ahead, `jumpToUnit` re-prioritizes, and `cancelStale` drops background work that is
no longer relevant.

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

`scripts/bench.md` records the progressive import as implemented with the lifecycle, priority,
concurrency, cancellation, and progressive-open behaviour above, plus the note that capsules
and return reminders are opt-in and default false.

## Performance targets

| Metric | Target | Status |
| --- | --- | --- |
| Time to visible import UI | Under 1s after selection | To measure |
| Time to first native-text unit | Under 2s for a representative PDF | To measure |
| Time to first OCR unit | Progress shown immediately | To measure |
| Long task during OCR | None over 100ms | To measure |
| Active OCR jobs | 1 to 3 by device class | Implemented |
| Memory | Bounded growth on long books | To measure |

Detail: [[Success Metrics]], [[Backlog P0-P1-P2]].

## Related

- [[Data Flow]] - where the scheduler sits in the pipeline
- [[PDF Parsing]] - what each unit does for PDFs
- [[OCR-Frontend Sync Contract]] - how backend scans integrate
- [[Frontend Public APIs]] - the exported manifest and scheduler surface