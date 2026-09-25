---
title: OCR Pipeline MOC
type: MOC
status: living
updated: 2026-09-25
tags: [bookflow, ocr, moc]
---

# OCR Pipeline MOC

How Bookflow reads pages that have no text, without uploading anything by default.

## Notes

- [[OCR Decision Tree]] - the four-tier ladder and its triggers
- [[Local Tesseract.js]] - on-device OCR, bounded workers, English-only scope
- [[Backend OCR Engine]] - FastAPI scan job, rasterization, batching, retries
- [[SSE Progress Streaming]] - event shapes, keepalives, cancellation, uploader UI
- [[OCR-Frontend Sync Contract]] - how backend output re-enters the book contract

## The rule

```text
Native PDF text  ->  local Tesseract.js  ->  honest local error
                                      \-> explicit user choice: accelerated backend
```

A page that already has selectable text is never sent to OCR. The backend branch is reachable only
after the user starts the optional accelerated OCR flow; it is not an automatic fallback from the
local import hook.

## Why this order

| Tier | Wins on | Cost |
| --- | --- | --- |
| Native text | Accuracy, speed, privacy | Requires a real text layer |
| Local OCR | Privacy, offline, no cost | Slow on hundreds of pages, English only |
| Backend OCR | Speed, difficult layouts, batching | Content leaves the device after explicit user action; needs a server |
| Error | Honesty | User does work manually |

## Frontend entry point

```js
scanPdfViaBackend(file, onProgress, { signal, batchSize = 16, ocrProfile = "small" })
```

Returns a normalized book with `Page N` chapters, plus `ocrPageCount`, `totalWords`, and
`skippedPages`. The returned promise exposes `.cancel()`.

## Backend entry point

```text
POST /api/ocr/scan                  -> { job_id, total_pages }
GET  /api/ocr/progress/{job_id}     -> SSE: initial, progress, completed, error
POST /api/ocr/cancel/{job_id}       -> abort and free buffers
```

Detail: [[Backend Endpoints]], [[Frontend Public APIs]].

## Guarantees

- Zero content persistence server-side.
- Unreadable pages are reported, never silently dropped.
- Page order is preserved from the source document.
- The user is told when content leaves the device and can cancel at any time.

Related: [[Privacy Model]], [[Invariants]], [[Roadmap MOC]].