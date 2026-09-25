---
title: SSE Progress Streaming
type: feature
status: verified
updated: 2026-09-25
tags: [bookflow, ocr, sse, streaming, ux]
source-files: [backend/main.py, src/components/OcrUploader.jsx, src/features/document-import/components/OcrUploader.jsx, src/features/document-import/hooks/useOcrSession.js, src/features/document-import/lib/backendOcrFallback.js]
---

# SSE Progress Streaming

OCR of a scanned book takes minutes. Streaming page-by-page progress is what turns that wait
into a visible, cancellable process instead of a frozen screen.

## Endpoints

| Purpose | Endpoint |
| --- | --- |
| Start scan | `POST /api/ocr/scan` |
| Subscribe to progress | `GET /api/ocr/progress/{job_id}` |
| Cancel job | `POST /api/ocr/cancel/{job_id}` |

## Event types

| Event | When | Payload highlights |
| --- | --- | --- |
| `initial` | Immediately on subscribe | status, current_page, total_pages, percent, pages if already complete |
| `progress` | After each page completes | current_page, total_pages, percent, total_words |
| `completed` | Job finished | percent 100, total_words, pages_per_second, elapsed_seconds, failed_pages, markdown, pages |
| `error` | Job failed | status, error message |

## Heartbeat

The server emits a `: keepalive` comment every 8 seconds:

```text
: keepalive
```

Two reasons this is not optional:

1. Mobile WebKit closes idle EventSource connections aggressively.
2. Intermediary proxies time out idle streams.

Without a heartbeat, a long book would see the progress stream silently die mid-scan and the
UI would hang at partial progress.

## Completion payload

```json
{
  "job_id": "uuid",
  "filename": "book.pdf",
  "status": "completed",
  "current_page": 240,
  "total_pages": 240,
  "percent": 100.0,
  "total_words": 96420,
  "pages_per_second": 3.4,
  "elapsed_seconds": 70.6,
  "failed_pages": [17, 193],
  "markdown": "...",
  "pages": []
}
```

`failed_pages` is how the reader learns which pages need attention, satisfying the rule that
unreadable content is reported rather than dropped.

Detail: [[Invariants]], [[Backend OCR Engine]].

## Client implementation

`scanPdfViaBackend` wraps `EventSource` and handles all four event types:

| Event | Client behaviour |
| --- | --- |
| `initial` | If already completed, assemble immediately. Else show page progress |
| `progress` | Update percent, clamped to 2 through 99 so the bar never misleads |
| `completed` | Assemble chapters and resolve |
| `error` | Reject with the server's message |

Malformed frames are ignored rather than killing the stream, because a single bad frame should
not destroy a ten-minute scan.

## Progress messaging

The accelerated flow is entered only after the user chooses it. The user sees specific, honest
text:

| Stage | Message |
| --- | --- |
| Choice | "Scanned PDF pages are sent only after you start this optional scan" |
| Start | "Ingesting PDF in memory..." |
| In progress | "Scanning Page 42 of 240" |
| Detail | "12,400 words so far. Cancel anytime." |
| Complete | "Backend scan complete. Assembling pages." |

An indeterminate spinner for minutes is a failure of design. Page numbers, word counts, and a
cancel affordance are the fix.

## Cancellation path

```text
user cancels, component unmounts, or abort signal fires
  -> close the EventSource
  -> POST /api/ocr/cancel/{job_id}
  -> server aborts and frees buffers
```

`cleanup()` guards against double-close, and a `settled` flag ensures the promise neither
resolves nor rejects twice.

## Uploader UI

`OcrUploader.jsx` is lazy-loaded through the root compatibility wrapper and provides the opt-in OCR
interface: file selection, live progress, word counts, and cancel. It offers `Use private on-device
OCR` when the backend scan fails, so the reader can return to the local path.

Detail: [[Frontend Architecture]], [[Privacy Model]].

## Failure messages the user can act on

```text
"Cannot reach the OCR backend at http://localhost:8000. Start it, then retry."
"Cannot stream backend progress at http://localhost:8000. Check the backend, then retry."
"Backend scan failed with status 422."
"The backend scan finished but found no readable text in this PDF."
```

Every message names what failed and what to do. This is the standard for import errors in
Bookflow.

Related: [[OCR-Frontend Sync Contract]], [[Privacy Model]], [[Backend Endpoints]].