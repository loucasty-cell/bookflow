---
title: SSE Progress Streaming
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, ocr, sse, streaming, ux]
source-files: [backend/app/services/ocr_sse.py, backend/app/services/ocr_pipeline.py, backend/app/services/ocr_jobs.py, backend/main.py, src/features/document-import/components/OcrUploader.jsx, src/features/document-import/components/OcrResultViewer.jsx, src/features/document-import/hooks/useOcrSession.js, src/features/document-import/lib/backendOcrFallback.js]
---

# SSE Progress Streaming

OCR of a scanned book takes minutes. Streaming page-by-page progress is what turns that wait into a
visible, cancellable process instead of a frozen screen.

## Endpoints

| Purpose | Endpoint |
| --- | --- |
| Start scan | `POST /api/ocr/scan` |
| Subscribe to progress | `GET /api/ocr/progress/{job_id}` |
| Cancel job | `POST /api/ocr/cancel/{job_id}` |

## Response headers

`NO_STORE_HEADERS` at `ocr_sse.py:10-14`, applied by `set_no_store` (`:17-19`):

| Header | Value |
| --- | --- |
| `Cache-Control` | `no-store, no-cache, must-revalidate, max-age=0` |
| `Pragma` | `no-cache` |
| `Expires` | `0` |

The progress response additionally sets `Connection: keep-alive` and `X-Accel-Buffering: no`
(`ocr_sse.py:117-121`). The `POST /api/ocr/stream/pdf` route sets the same two at
`routers/ocr.py:352-353`.

`X-Accel-Buffering: no` is the one that matters in practice. Without it, a reverse proxy buffers the
response and the client sees nothing until the buffer fills, which for a page-by-page stream means
the progress bar looks frozen for the entire scan.

## Event types

Defined in `ocr_sse.py` and emitted from `ocr_pipeline.py`:

| Event | Emitter | Payload highlights |
| --- | --- | --- |
| `initial` | `ocr_sse.py:81`, builder `:38-49` | `job_id`, `filename`, `status`, `current_page`, `total_pages`, `percent`, `total_words`, `pages` when already complete |
| `status` | `ocr_pipeline.py:46` | `{ status: "processing", total_pages }`, sent before page work starts |
| `progress` | `ocr_sse.py:140`, builder `:134-146` | The initial fields plus `current_page`, `percent`, `total_words`, `pages_per_second`, `elapsed_seconds`, `latest_page`, `error` |
| `completed` | `ocr_sse.py:84`, `ocr_pipeline.py:187` | The initial fields plus `percent` fixed at `100.0`, `pages_per_second`, `elapsed_seconds`, `markdown`, `failed_pages` |
| `error` | `ocr_sse.py:88`, `main.py:391`, `ocr_pipeline.py:201,218` | `{ error }` |

`latest_page` on a progress frame is what lets the UI show the recognised text without waiting for the
whole markdown.

## Heartbeat

The server emits a `: keepalive` comment frame every **8.0** s (`ocr_sse.py:93,98`):

```text
: keepalive
```

Two reasons this is not optional:

1. Mobile WebKit closes idle EventSource connections aggressively.
2. Intermediary proxies time out idle streams.

Without a heartbeat, a long book would see the progress stream silently die mid-scan and the UI would
hang at partial progress.

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
  "markdown": "..."
}
```

`failed_pages` is how the reader learns which pages need attention, satisfying the rule that
unreadable content is reported rather than dropped.

## A second SSE route with a different shape

`POST /api/ocr/stream/pdf` (`backend/app/routers/ocr.py:293`, SSE frames at `:322-345`) is a
separate streaming endpoint with a **different** event vocabulary. Do not mix the two up.

| Event | Line | Payload |
| --- | --- | --- |
| `start` | `:323` | `{ status: "processing", filename }` |
| `page` | `:341` | `{ page_number, text, paragraphs, model_used, success }` |
| `completed` | `:343` | `{ total_pages, total_words }` |
| `error` | `:345` | `{ error }` |

Its distinguishing property is `model_used` on each page, which the job-progress stream does not
carry. So use the job stream for progress and this one when you need to attribute a page to a
provider.

Detail: [[Backend OCR Engine]], [[Backend Endpoints]].

## Client implementation

`scanPdfViaBackend` wraps `EventSource` and handles the event types. A `settled` flag ensures the
promise neither resolves nor rejects twice, no matter how many frames arrive, and malformed frames
are ignored rather than killing the stream, because one bad frame should not destroy a ten-minute
scan.

## Progress messaging

The accelerated flow is entered only after the user chooses it. The user sees page numbers, word
counts, and a cancel affordance rather than an indeterminate spinner. An indeterminate spinner for
minutes is a failure of design.

## Cancellation path

```text
user cancels, component unmounts, or abort signal fires
  -> close the EventSource
  -> POST /api/ocr/cancel/{job_id}
  -> server aborts and frees buffers
```

`cleanup()` guards against double-close.

## Uploader and result UI

- `components/OcrUploader.jsx` provides the opt-in OCR interface: file selection, live progress, word
  counts, and cancel. It offers a return to the private on-device path when the backend scan fails.
- `components/OcrResultViewer.jsx` is the review surface for a completed OCR result.
- `hooks/useOcrSession.js` holds the OCR session state.

None of these three is exported from the document-import barrel. They are real modules; they are just
not public API.

Detail: [[Frontend Architecture]], [[Privacy Model]], [[OCR-Frontend Sync Contract]].