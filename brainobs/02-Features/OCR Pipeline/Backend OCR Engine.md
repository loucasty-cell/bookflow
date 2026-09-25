---
title: Backend OCR Engine
type: feature
status: verified
updated: 2026-09-25
tags: [bookflow, ocr, backend, fastapi, performance]
source-files: [backend/main.py, backend/app/routers/ocr.py, backend/app/core/config.py, backend/app/services/ocr_service.py, backend/app/services/paddle_ocr.py, backend/app/services/huggingface_ocr.py, backend/tests/test_accelerated_ocr.py, updateOCRdata.md]
---

# Backend OCR Engine

The optional accelerated path. The user must explicitly start it from the OCR modal. After that
start action, `POST /api/ocr/scan` accepts a PDF, returns a `job_id` immediately, and runs the
pipeline in the background while progress streams over SSE. No local import error invokes this
endpoint automatically.

## Constants

| Constant | Value | Reason |
| --- | --- | --- |
| `DEFAULT_BATCH_SIZE` | `16` pages | Bounds peak memory |
| `RENDER_DPI` | `96` | Legible for OCR, small enough to stream |
| `RENDER_SCALE` | `1.3333` | PyMuPDF zoom from 72 DPI base |
| `MAX_RETRIES` | `3` | Survives cold starts and transient provider failures |
| `THREAD_POOL_WORKERS` | `min(32, cpu_count * 4)` | Caps rasterization parallelism |
| Fast-path threshold | `>= 15` words | Below this, a page is treated as needing OCR |
| Upload ceiling | `50` MB | Matches `backend/main.py` and `backend/app/core/config.py` |

## Request

`POST /api/ocr/scan`, `multipart/form-data`:

| Field | Meaning |
| --- | --- |
| `file` | The PDF binary |
| `batch_size` | Pages per batch, default 16 |
| `ocr_profile` | `small` default, `medium` for higher quality |

The frontend sends `batchSize = 16` and `ocrProfile = "small"` by default.

The response is immediate:

```json
{ "job_id": "uuid", "total_pages": 240 }
```

Returning immediately is what makes streaming possible. The alternative, blocking until the
whole book is recognized, is precisely the experience Bookflow exists to avoid.

## Pipeline

```text
create OCRJob, register in jobs
schedule background task
for each batch of batch_size pages:
    rasterize the batch (ThreadPoolExecutor, 96 DPI)
    per page:
        if native text has >= 15 words -> use it, no OCR call
        else -> dispatch to the provider chain
    append page results, notify subscribers
    release batch image buffers
assemble markdown
mark completed, notify subscribers
```

## Provider chain

This provider failover is internal to an explicitly started backend job. It is distinct from the
browser's default local path and does not make a local parse error an automatic upload.

```text
PaddleOCR (when PADDLEOCR_URL is configured)
  -> Hugging Face OpenAI-compatible vision route
```

| Provider | Role |
| --- | --- |
| PaddleOCR | Self-hosted, deterministic, no token required, preferred |
| Hugging Face route | Fallback for difficult layouts, may require a token |

Multi-router failover is enforced between the Hugging Face Inference API and the HF Router
endpoint, with bounded retries and cold-start recovery.

Detail: [[Environment Config]], [[Docker OCR]].

## Concurrency design

Two rules, both non-negotiable:

1. Never run blocking CPU or I/O on the async event loop. Rasterization goes to a
   `ThreadPoolExecutor`, so the event loop keeps serving SSE heartbeats and new requests while
   pages render.
2. Use a persistent `httpx.AsyncClient` with bounded keep-alive connections. Creating a client
   per request would add TLS handshake cost to every page.

Without these, a large scan would make the service unresponsive to everyone including the user
watching the progress bar.

Detail: [[Backend Architecture]].

## Memory discipline

This is where a naive implementation dies on a 600 page book:

| Risk | Mitigation |
| --- | --- |
| Holding every page image at once | Fixed batches of 16, processed on the fly |
| Base64 images retained after use | `image_b64` cleared after each batch |
| Job results accumulating forever | `prune_stale_jobs` TTL of 3600s, 1800s after completion |
| Failed jobs holding buffers | `pages`, `markdown`, `total_words` cleared on failure |

The verified change note records the improvement precisely: the backend iterates chunks of
`batch_size` directly rather than rendering an entire book into uncompressed base64 JPEGs in
the heap.

## Page result shape

```json
{
  "page_number": 42,
  "text": "Recognized page text",
  "word_count": 210,
  "latency_ms": 480.2,
  "success": true,
  "error": null
}
```

Tracked per page, not concatenated into one blob. This is what makes per-page reporting,
skipped page lists, and ordered reassembly possible.

## Partial failure policy

```text
some pages fail  -> job succeeds, failed page numbers returned and surfaced
every page fails -> job fails, message lists the page numbers
```

The client maps failures into `skippedPages`, so nothing disappears silently.

Detail: [[OCR-Frontend Sync Contract]].

## Output assembly

```text
<!-- Page N -->

page text

---

<!-- Page N+1 -->

page text
```

Pages are sorted by page number before assembly, so source order is guaranteed even when
batches finish out of order.

## Cancellation

`POST /api/ocr/cancel/{job_id}` aborts the job and releases in-memory buffers. The frontend
calls this on unmount, on component teardown, and whenever the user cancels the upload.

Detail: [[SSE Progress Streaming]].

## Verification

```bash
pytest backend/tests/ -v
npx pyright
```

The current suite contains 45 tests across 8 modules; re-count from the command output rather than
copying an older baseline.

Then behaviourally: start the backend, scan a scanned PDF, confirm page order in the reader
matches the source image, and confirm cancellation actually stops work.

Detail: [[Verification Checklist]], [[Testing Pipeline]].