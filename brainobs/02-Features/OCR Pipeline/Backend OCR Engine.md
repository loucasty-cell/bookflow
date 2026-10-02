---
title: Backend OCR Engine
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, ocr, backend, fastapi, performance]
source-files: [backend/main.py, backend/app/routers/ocr.py, backend/app/core/config.py, backend/app/services/ocr_pipeline.py, backend/app/services/ocr_providers.py, backend/app/services/ocr_rendering.py, backend/app/services/ocr_jobs.py, backend/app/services/ocr_service.py, backend/app/services/paddle_ocr.py, backend/app/services/huggingface_ocr.py, backend/ocr_worker.py, backend/tests/test_accelerated_ocr.py]
---

# Backend OCR Engine

The optional accelerated path. The user must explicitly start it from the OCR modal. After that start
action, `POST /api/ocr/scan` accepts a PDF, returns a `job_id` immediately, and runs the pipeline in
the background while progress streams over SSE. No local import error invokes this endpoint
automatically.

## Constants

| Constant | Value | Where | Reason |
| --- | --- | --- | --- |
| `DEFAULT_BATCH_SIZE` | `16` pages | `main.py` | Bounds peak memory |
| `RENDER_DPI` | `96` | `ocr_rendering.py:12` | Legible for OCR, small enough to stream |
| `RENDER_SCALE` | `96 / 72` | `ocr_rendering.py:13` | PyMuPDF zoom from the 72 DPI base |
| `MAX_RETRIES` | `3` | `main.py:89` | Survives cold starts and transient provider failures |
| `THREAD_POOL_WORKERS` | `min(32, (cpu_count or 4) * 4)` | `main.py:92` | Caps rasterization parallelism |
| Fast-path threshold | `>= 15` words | `ocr_rendering.py:74`, `ocr_providers.py:298` | Below this, a page is treated as needing OCR |
| `MAX_UPLOAD_BYTES` | `52428800` | `main.py:91` | 50 MB upload ceiling |
| `max_batch_images` | `32` | `core/config.py:92` | Server-side batch ceiling |
| `max_pdf_pages_ocr` | `1000` | `core/config.py:93` | Server-side page ceiling |

Rasterized pages are encoded as JPEG at quality 85 with `alpha False`
(`ocr_rendering.py:82-83`), which is a real memory decision: an uncompressed RGBA buffer for a
1000-page book is what kills the process.

## Request

`POST /api/ocr/scan`, `multipart/form-data`, declared at `backend/main.py:153`:

| Field | Default | Validation |
| --- | --- | --- |
| `file` | required | Rejected above `MAX_UPLOAD_BYTES` at both `:179` and `:191` |
| `batch_size` | `16` | Clamped to `1..32` at `:215` |
| `force_ocr` | `false` | Bypasses the native-text fast path |
| `ocr_profile` | `"small"` | Must be `small` or `medium`, else HTTP 400 at `:217-221` |

The response is immediate:

```json
{ "job_id": "uuid", "total_pages": 240 }
```

Returning immediately is what makes streaming possible. The alternative, blocking until the whole
book is recognized, is precisely the experience Bookflow exists to avoid.

## Job routes

| Route | Line | Purpose |
| --- | --- | --- |
| `POST /api/ocr/scan` | `main.py:153` | Start a job |
| `GET /api/ocr/progress/{job_id}` | `main.py:264` | SSE progress stream |
| `GET /api/ocr/job/{job_id}` | `main.py:300` | Job status snapshot |
| `GET /api/ocr/result/{job_id}` | `main.py:333` | Result, or **202** while still processing |
| `POST /api/ocr/cancel/{job_id}` | `main.py:369` | Abort and free buffers |

`GET /api/ocr/result` returning 202 rather than an empty payload is what lets a client poll without
mistaking "not ready" for "no text found".

## Concurrency and job limits

`backend/app/services/ocr_jobs.py:6-10` bounds everything:

| Limit | Value |
| --- | --- |
| `MAX_JOBS` | `100` tracked jobs |
| `MAX_ACTIVE_JOBS` | `4` running at once, enforced by a shared `asyncio.Semaphore` |
| `MAX_PENDING_JOBS` | `8` |
| `MAX_SUBSCRIBERS_PER_JOB` | `16` |
| `SUBSCRIBER_QUEUE_SIZE` | `32` frames |
| Job TTL | `3600` s, and `1800` s after completion |

The subscriber queue is bounded on purpose. A slow or abandoned EventSource cannot make the server
buffer unbounded progress frames.

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
assemble markdown, sorted by page number
mark completed, notify subscribers
```

Pages are sorted by page number before assembly, so source order is guaranteed even when batches
finish out of order.

## Provider chain

This failover is internal to an explicitly started backend job. It is distinct from the browser's
default local path and does not make a local parse error an automatic upload.

```text
PaddleOCR first, when PADDLEOCR_URL is configured
  -> Hugging Face OpenAI-compatible vision route, only if PaddleOCR returned nothing
```

| Provider | Role | Reported as |
| --- | --- | --- |
| PaddleOCR | Self-hosted, deterministic, no token required, preferred | `paddleocr-v6-{profile}` (`paddle_ocr.py:85`) |
| Hugging Face route | Fallback for difficult layouts, may require a token | the model id |

A failure is reported as the bare string `paddleocr` (`paddle_ocr.py:96`), so the client can
distinguish a PaddleOCR failure from a PaddleOCR absence.

`paddle_ocr.py:18-19` keeps a shared `httpx.AsyncClient` per timeout key with
`Limits(keepalive_connections=16, max_connections=32)`, so per-page calls do not pay a TLS handshake.
`ocr_pipeline.py:48-49` additionally uses a per-batch client with
`Limits(max_keepalive_connections=batch_size, max_connections=batch_size * 2)` and `timeout=60.0`.

The Hugging Face preflight runs **only** when a non-native page exists **and** `paddleocr_url` is
empty (`ocr_pipeline.py:59-71`). When PaddleOCR is configured, the HF route is never probed, which
avoids a pointless remote call on every job.

Detail: [[Environment Config]], [[Docker OCR]], [[OCR Decision Tree]].

## Hugging Face endpoint validation

`ocr_providers.py` treats a configured endpoint as untrusted configuration:

| Function | Line | Rule |
| --- | --- | --- |
| `validate_model_id` | `:49` | At most 200 chars, must match `MODEL_ID_PATTERN`, no `.` or `..` path segments |
| `validate_hf_inference_url` | `:60-86` | HTTPS only; host must be `router.huggingface.co`, `huggingface.co`, or `*.endpoints.huggingface.cloud`; port 443 only; no credentials, query, or fragment |
| `ensure_hf_inference_support` | `:99` | Probes whether the model is actually routed before use |

This is a client-redirect hardening measure. An arbitrary URL in an environment variable would
otherwise turn OCR into an SSRF primitive.

## Retry policy, and one honest inconsistency

`ocr_providers.py` retry ladder:

| Condition | Behaviour | Line |
| --- | --- | --- |
| HTTP 503 | Sleep `min(estimated_time, 25.0)` | `:406` |
| HTTP 429 | Sleep `2.0 * attempt` | `:425` |
| Generic backoff | `0.5 * 2 ** (attempt - 1)` | `:445` |
| HTTP 400 / 401 / 403 / 404 | Hard break, no retry | `:442` |

`huggingface_ocr.py` does **not** match this, and the difference is real rather than cosmetic:

| Condition | `ocr_providers.py` | `huggingface_ocr.py` |
| --- | --- | --- |
| HTTP 503 wait cap | `25.0` s (`:406`) | `10.0` s (`:264`) |
| HTTP 429 | Sleep and retry `2.0 * attempt` (`:425`) | **Raises immediately**, no retry (`:278-281`) |
| Generic backoff | `0.5 * 2 ** (attempt - 1)` (`:445`) | `1.0 * attempt` (`:302`) |

Both paths also cache: `huggingface_ocr.py` keeps a SHA-256 LRU cache of at most 1000 entries
(`:51,247-248`), so a re-rendered identical page does not re-invoke a paid provider. That cache is
why a provider path can be hit twice for identical bytes.

Treat the two retry policies as separate implementations, not as one policy with two names. If you
change one, check whether the other should follow.

## Concurrency design

Two rules, both non-negotiable:

1. Never run blocking CPU or I/O on the async event loop. Rasterization goes to a `ThreadPoolExecutor`
   with `THREAD_POOL_WORKERS` (`main.py:92-93`), and `render_pdf_pages_async` dispatches onto that
   shared executor (`ocr_rendering.py:118-127`). The event loop keeps serving SSE heartbeats and new
   requests while pages render.
2. Use a persistent `httpx.AsyncClient` with bounded keep-alive connections. Creating a client per
   request would add TLS handshake cost to every page.

## Memory discipline

| Risk | Mitigation |
| --- | --- |
| Holding every page image at once | Fixed batches of `batch_size`, processed on the fly |
| Base64 images retained after use | `image_b64` cleared after each batch |
| Job results accumulating forever | TTL of 3600 s, 1800 s after completion (`ocr_jobs.py:66,84-85`) |
| Failed jobs holding buffers | `pages`, `markdown`, `total_words` cleared on failure |
| Unbounded subscriber backlog | `SUBSCRIBER_QUEUE_SIZE` of 32 (`ocr_jobs.py:10`) |

## Partial failure policy

```text
some pages fail  -> job succeeds, failed page numbers returned and surfaced
every page fails -> job fails, message lists the page numbers
```

The client maps failures into `skippedPages`, so nothing disappears silently.

Detail: [[OCR-Frontend Sync Contract]].

## Cancellation

`POST /api/ocr/cancel/{job_id}` aborts the job and releases in-memory buffers. The frontend calls this
on unmount, on component teardown, and whenever the user cancels the upload.

Detail: [[SSE Progress Streaming]].

## The separate PaddleOCR service

`backend/ocr_worker.py` is the standalone PaddleOCR service, not a module under `app/`. It is worth
knowing where it actually lives, because a path under `backend/app/services/` does not exist.

| Fact | Line |
| --- | --- |
| `small` profile | `PP-OCRv6_small_det` + `PP-OCRv6_small_rec` |
| `medium` profile | `PP-OCRv6_medium_det` + `PP-OCRv6_medium_rec` |
| `OCR_MAX_IMAGE_MB` default `20` | `:26` |
| `OCR_DEVICE` default `cpu` | `:27` |
| `OCR_PRELOAD_PROFILES` default `small` | `:30` |
| Pipeline flags | `use_doc_orientation_classify=False`, `use_doc_unwarping=False`, `use_textline_orientation=True`, `device=OCR_DEVICE` (`:49-56`) |

Each profile is guarded by its own `asyncio.Lock` and run through `asyncio.to_thread` (`:84-95`), so
one profile's lock cannot serialise the other, and blocking inference never touches the event loop.

Orientation classification and unwarping are off by design. They are the two most expensive stages
and they help most on photographed pages, which are exactly the pages the backend is not the first
choice for.

## Verification

```bash
pytest backend/tests/ -v
npx --no-install pyright
```

Measured 2026-10-02: `pytest backend/tests/` reports **75 passed**. Re-count from the command output
rather than copying an older baseline.

Then behaviourally: start the backend, scan a scanned PDF, confirm page order in the reader matches
the source image, and confirm cancellation actually stops work.

Detail: [[Verification Checklist]], [[Testing Pipeline]].