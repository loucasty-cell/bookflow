---
title: Backend Endpoints
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, api, backend, fastapi, ocr, contract]
source-files: [backend/main.py, backend/app/main.py, backend/app/routers/health.py, backend/app/routers/ocr.py, backend/app/routers/documents.py, backend/app/routers/reader.py, backend/routers/social.py, backend/app/models/document.py, backend/app/models/ocr.py, backend/app/models/reader.py, backend/app/services/ocr_providers.py, backend/app/services/ocr_sse.py, backend/app/services/ocr_rendering.py, backend/app/services/ocr_pipeline.py, backend/app/core/config.py, backend/ocr_worker.py]
---

# Backend Endpoints

Every route Bookflow's backend exposes, what consent and limit applies to each, and the two
structural facts that decide which of them actually answer a request.

Status: **verified** against `backend/` on 2026-10-02.

## Read this first: there are two FastAPI apps

This is the single most important fact in this note, because it decides whether a test
exercises the code that actually serves traffic.

| App | File | Built at | Served by | Tested by |
| --- | --- | --- | --- | --- |
| Inline OCR engine | `backend/main.py` (613 lines) | `main.py:131` | `Dockerfile`, `backend/Dockerfile`, `backend/run.py` — all run `uvicorn main:app` | `backend/tests/test_accelerated_ocr.py` imports `main` |
| Modular package | `backend/app/main.py` (82 lines) | `app/main.py:28` | nothing in this repo | `backend/tests/conftest.py:8` imports `from app.main import app` |

`backend/main.py:599-607` wraps its router include in `try: ... except ImportError: pass`. A
broken `app/` package therefore does not crash the server; it silently degrades it to inline
routes only, with no log line.

### Route shadowing on `/api/health`

`backend/main.py:412` registers `GET /api/health` inline, and `main.py:602` afterwards includes
`health_router`, whose own `GET /api/health` lives at `backend/app/routers/health.py:10`.
FastAPI matches first-registered first, so in the served app the **inline** handler wins and the
router's version is dead code.

The two return different shapes:

- inline (`main.py:412`): `model`, `remote_ocr_configured`, `thread_workers`, `paddleocr_profiles`
- router (`routers/health.py:10`): `environment`, `timestamp`

`backend/tests/test_health.py:3-9` asserts `"timestamp" in data`, so it can only ever pass against
`app.main`. It does not describe the served app.

### Only four backend routes are called from the frontend

Searching `src/` for `/api/` finds four live references: the OCR scan job, the OCR progress
stream, the backend OCR fallback, and the reading lens. Everything else is exposed and unused by
this client. That is fine for a modular backend, but do not assume a passing test means the
browser depends on that route.

## Inline routes, `backend/main.py`

| Method | Path | Line | Purpose |
| --- | --- | --- | --- |
| POST | `/api/ocr/scan` | 153 | Start an async PDF OCR job; returns `job_id` + `stream_url` |
| GET | `/api/ocr/progress/{job_id}` | 264 | SSE progress stream |
| GET | `/api/ocr/job/{job_id}` | 300 | Job snapshot plus page results |
| GET | `/api/ocr/result/{job_id}` | 333 | Final Markdown; **202** if still processing |
| POST | `/api/ocr/cancel/{job_id}` | 369 | Cancel, clear buffers, notify subscribers |
| GET | `/health` | 411 | Container healthcheck probe |
| GET | `/api/health` | 412 | Health payload; shadows `routers/health.py:10` |

### `POST /api/ocr/scan`

Request (`main.py:154-164`): `file` (UploadFile), `model_id`, `batch_size` (default **16**,
clamped 1–32 at `:215`), `force_ocr` (default `False`), `ocr_profile` (default `"small"`,
validated to exactly `{small, medium}` else **400** at `:217-221`), plus `authorization` and
`x_hf_token` headers.

Response (`main.py:251-261`): `success`, `job_id`, `filename`, `total_pages`, `model`,
`ocr_profile`, `batch_size`, `status`, `stream_url`. Note this route declares **no
`response_model`**; it returns a raw dict.

`MAX_UPLOAD` is 50 MB / 52,428,800 bytes (`main.py:90-91`). The limit is declared at `:178` and
re-checked against the actual upload at `:191`.

## Package routes, `backend/app/routers/`

| Method | Path | Line | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | `health.py:10` | — | inline dict (`environment`, `timestamp`) |
| GET | `/api/info` | `health.py:22` | — | inline dict |
| GET | `/api/ocr/models` | `ocr.py:151` | — | `OCRModelListResponse` |
| POST | `/api/ocr/image` | `ocr.py:165` | multipart `file`, `model_id`, `ocr_profile` | `OCRPageResult` |
| POST | `/api/ocr/batch` | `ocr.py:200` | multipart `files[]` | `OCRBatchResponse` |
| POST | `/api/ocr/pdf` | `ocr.py:253` | multipart `file`, `force_ocr` | `OCRDocumentResponse` |
| POST | `/api/ocr/stream/pdf` | `ocr.py:293` | multipart | **SSE** `StreamingResponse` |
| POST | `/api/documents/validate` | `documents.py:10` | form `file_name`, `file_size_bytes` | `DocumentValidationResponse` |
| POST | `/api/documents/parse` | `documents.py:20` | multipart `file` | `ParseResponse` |
| POST | `/api/reading-lens` | `reader.py:319` | `ReadingLensRequest` | **SSE** |
| POST | `/api/reader/segment` | `reader.py:376` | `SegmentRequest` | `SegmentResponse` |
| POST | `/api/reader/reading-time` | `reader.py:398` | `ReadingTimeRequest` | `ReadingTimeResponse` |
| POST | `/api/reader/notes/export` | `reader.py:427` | `ExportPayload` | `ExportPayload` (echo) |
| POST | `/api/reader/notes/import` | `reader.py:435` | `ExportPayload` | inline dict |
| GET | `/` | `app/main.py:73` | — | inline dict |

### Mock-only social routes

`backend/routers/social.py` (68 lines) sits **outside** the `app/` package and defines two
routes that return mock data:

| Method | Path | Line |
| --- | --- | --- |
| GET | `/api/social/resonance/{paragraph_hash}` | 50 |
| POST | `/api/social/events/session-pulse` | 62 (returns **202**) |

There is no persisted community experience and no frontend caller. The mock `quote` and
`user_id` fields in the response contradict the zero-upload and deniability properties the design
claims, and a paragraph hash is trivially enumerable by a caller who can guess the text. Keep
`status: planned` for Social Resonance and do not describe these as a feature.

## `POST /api/reading-lens` — the consent endpoint

`backend/app/routers/reader.py:319`. Request schema at `reader.py:54`.

| Field | Rule |
| --- | --- |
| `prompt` | `str`, min 1, max `LENS_MAX_PROMPT_CHARS` (8000) |
| `passage` | `Optional[str]`, max `LENS_MAX_PASSAGE_CHARS` (24000) |
| `action` | `Optional[Literal["summarize","explain","translate","trivia"]]` |
| `consent` | `bool = False` |
| extra fields | **forbidden** (`extra="forbid"`, `reader.py:57`) |

A `model_validator(mode="before")` at `reader.py:64-69` rejects an explicit `passage: null`,
so an omitted passage and a nulled passage behave differently on purpose.

### The guard order is the security property

1. **`if not req.consent: raise 403`** — `reader.py:338-345`, checked **first, before the
   provider key is read** at `:347`. `403` is declared in the route's `responses` at `:324`.
2. Missing or blank `gemini_api_key` → **503** (`:347-352`)
3. Empty model chain → **503** (`:354-359`)
4. Base URL gate (`reader.py:142-160`): HTTPS only, host must be
   `generativelanguage.googleapis.com`, no credentials, no query, no fragment, else **500**
5. Per-IP quota from `request.client.host` → **429** with `Retry-After` (`:104-126`, `:362-363`),
   LRU-capped at 512 tracked clients (`:88-90`)
6. `httpx` client built with `follow_redirects=False` (`:183`)

Prompt-injection containment: the passage is fenced in `<passage>` and labelled untrusted data,
and the system prompt forbids treating it as instructions (`reader.py:39-49`, `:166`).
`generationConfig` is `temperature: 0.2`, `maxOutputTokens: 800` (`:173-176`).

### SSE events

| Event | Payload | Line |
| --- | --- | --- |
| `start` | `status: "streaming"`, `action`, `consent: true`, `candidates: [model]` | 244-252 |
| `delta` | `text` | 279 |
| `completed` | `text`, `model`, `fallbackUsed`, `attempts`, `finishReason` | 297-306 |
| `error` (`not_configured`) | provider not configured | 255-262 |
| `error` (`stream_interrupted`) | upstream stream broke mid-answer | 284-292 |
| `error` (`provider_unavailable`) | every provider in the chain failed | 309-316 |

The stream always terminates with exactly one `completed` **or** one `error` (`reader.py:240`,
`:296-316`). Response headers set no-store, keep-alive, and `X-Accel-Buffering: no`
(`:368-372`).

The client half of this contract, including the local short-circuit that never calls `fetch`, is
in [[Reading Lens]].

## OCR job SSE: `GET /api/ocr/progress/{job_id}`

Payload builders live in `backend/app/services/ocr_sse.py`.

| Event | Fields | Line |
| --- | --- | --- |
| `initial` | `job_id`, `filename`, `status`, `current_page`, `total_pages`, `percent`, `total_words`, `pages`, `markdown` (only when complete) | `ocr_sse.py:81`, builder 38-49 |
| `status` | `status: "processing"`, `total_pages` | `ocr_pipeline.py:46` |
| `progress` | the above plus `pages_per_second`, `elapsed_seconds`, `latest_page`, `error` | `ocr_pipeline.py:140`, builder `ocr_sse.py:134-146` |
| `completed` | initial fields plus `percent: 100.0`, `pages_per_second`, `elapsed_seconds`, `markdown`, `failed_pages` | `ocr_sse.py:84`, `ocr_pipeline.py:187`, `completion_data` 173-186 |
| `error` | `job_id`, `status`, `error` | `ocr_sse.py:88`, `main.py:391`, `ocr_pipeline.py:201,:218` |
| `: keepalive` | comment frame every **8.0 s** | `ocr_sse.py:93`, `:98` |

Headers: `Cache-Control`, `Pragma`, `Expires` all `no-store` (`ocr_sse.py:11-15`),
`Connection: keep-alive`, `X-Accel-Buffering: no` (`:117-121`).

## OCR stream SSE: `POST /api/ocr/stream/pdf`

A second, smaller SSE vocabulary on `backend/app/routers/ocr.py:293`, streaming at `:322-345`:

| Event | Payload |
| --- | --- |
| `start` | `status: "processing"`, `filename` |
| `page` | `page_number`, `text`, `paragraphs`, `model_used`, `success` |
| `completed` | `total_pages`, `total_words` |
| `error` | `error` |

Do not conflate this with the job stream above; the field names differ.

## OCR resolution ladder

`backend/app/services/ocr_providers.py:282` is the single decision point. Order matters and is
deliberate — PaddleOCR is tried before any hosted model.

1. Native text of ≥ 15 words and not `force_ocr` → return it, no OCR at all (`:298-306`)
2. No `image_b64` → return native (`:308-316`)
3. **PaddleOCR first** (`:341-357`). Profiles are `["medium"]` when medium was requested,
   otherwise `["small", "medium"]` (`:229`) — so a small profile **auto-retries medium**. A
   per-page failure logs and continues rather than aborting the job (`:272-278`).
4. Only if PaddleOCR returned nothing **and** `model_id` is non-empty → Hugging Face vision
   (`:359-401`)
5. With no model configured → `"PaddleOCR returned no text and no Hugging Face OCR model is
   configured."` (`:359-367`)
6. After retries are exhausted → fall back to native text if it has ≥ 3 words (`:448-457`)

Retry policy in the same file: `503` sleeps `min(estimated_time, 25.0)` (`:406`); `429` sleeps
`2.0 * attempt` (`:425`); backoff is `0.5 * 2**(attempt-1)` (`:445`); `400/401/403/404`
hard-break (`:442`). `max_retries` is 3 (`main.py:89`).

### Known inconsistency between the two HTTP paths

`backend/app/services/huggingface_ocr.py` handles the same provider differently:

| Behaviour | `ocr_providers.py` | `huggingface_ocr.py` |
| --- | --- | --- |
| 503 wait cap | up to 25 s, then retry | up to 10 s (`:264`) |
| 429 | retries with backoff (`:425`) | **raises immediately** (`:278-281`) |
| Backoff | `0.5 * 2**(n-1)` (`:445`) | different formula (`:302`) |

This is a real divergence, not a documentation gap. When touching OCR retry behaviour, decide
which file owns the policy and make the other defer to it.

### Hardening

`validate_model_id` (`ocr_providers.py:49`): ≤ 200 chars, regex-validated, no `.` or `..`
segments. `validate_hf_inference_url` (`:60-86`): HTTPS required; host must be
`router.huggingface.co`, `huggingface.co`, or `*.endpoints.huggingface.cloud`; port 443 only; no
credentials, query, or fragment. `ensure_hf_inference_support` (`:99`) prefights with
`GET router.huggingface.co/v1/models/{id}` (`:119`) or
`GET huggingface.co/api/{id}?expand[]=inferenceProviderMapping` (`:144-157`), and runs **only**
when a non-native page exists and `paddleocr_url` is empty (`ocr_pipeline.py:59-71`).

## Limits and timeouts

| Limit | Value | Line |
| --- | --- | --- |
| `MAX_UPLOAD_MB` / bytes | 50 / 52,428,800 | `main.py:90-91`, declared 178, checked 191 |
| `max_upload_size_mb` | 50 | `config.py:91`, `routers/ocr.py:21` |
| `max_batch_images` | 32 | `config.py:92`, checked `routers/ocr.py:215` |
| `max_pdf_pages_ocr` | 1000 | `config.py:93` |
| EPUB entries | 500 | `document_service.py:326` |
| EPUB uncompressed | 100 MB | `document_service.py:327` |
| EPUB XML | 10 MB | `document_service.py:328` |
| Job caps | `MAX_JOBS` 100, `MAX_ACTIVE_JOBS` 4, `MAX_PENDING_JOBS` 8, `MAX_SUBSCRIBERS_PER_JOB` 16, queue 32 | `ocr_jobs.py:6-10` |
| Job TTL | 3600 s; completed jobs 1800 s | `main.py:595`, `ocr_jobs.py:85` |
| Lens prompt / passage / output | 8000 / 24000 chars / 800 tokens | `config.py:83-85`, `reader.py:30-31` |
| Lens rate limit | 40 requests / 900 s / 512 clients | `config.py:86-88` |
| HF image pre-scale | max dimension 2048 | `huggingface_ocr.py:72` |
| Worker decoded-image cap | 20 MB | `ocr_worker.py:26`, enforced `:128` |

Timeouts: pipeline httpx 60.0 s (`ocr_pipeline.py:49`); `PADDLEOCR_TIMEOUT` 60.0 s
(`config.py:58`); `HF_API_TIMEOUT` 60.0 s (`config.py:59`); `GEMINI_TIMEOUT_SECONDS` 12.0 s as an
`httpx.Timeout` with `follow_redirects=False` (`config.py:82`, `reader.py:180-184`); SSE heartbeat
8.0 s (`ocr_sse.py:93`).

## Threading and rasterization

| Constant | Value | Line |
| --- | --- | --- |
| `THREAD_POOL_WORKERS` | `min(32, (os.cpu_count() or 4) * 4)` | `main.py:92-93` |
| `RENDER_DPI` | 96 | `ocr_rendering.py:12` |
| `RENDER_SCALE` | `96 / 72.0` | `ocr_rendering.py:13` |
| Native-text threshold | 15 words | `ocr_rendering.py:74`, re-checked `ocr_providers.py:298` |
| JPEG quality | 85, `alpha=False` | `ocr_rendering.py:82-83` |

`render_pdf_pages_async` dispatches to the shared executor (`ocr_rendering.py:118-127`).
PyMuPDF blocks are sorted by `round(b[1]/15.0), b[0]` to stop two-column text interleaving
(`document_service.py:231`) — the client-side parser does **not** do this, which is the one real
structural asymmetry between the two parsers.

## The PaddleOCR worker

`backend/ocr_worker.py` is a separate FastAPI app on port 8080 exposing `/ocr`.

| Profile | Detection | Recognition |
| --- | --- | --- |
| `small` | `PP-OCRv6_small_det` | `PP-OCRv6_small_rec` |
| `medium` | `PP-OCRv6_medium_det` | `PP-OCRv6_medium_rec` |

Defined at `ocr_worker.py:16-25`. Pipeline built with
`use_doc_orientation_classify=False`, `use_doc_unwarping=False`,
`use_textline_orientation=True`, `device=OCR_DEVICE` (`:49-56`). Each profile has an
`asyncio.Lock` and runs in `asyncio.to_thread` (`:84-95`). Result envelope at `:138-149`;
`model_used` is reported as `paddleocr-v6-{profile}` (`paddle_ocr.py:85`) and failure as
`"paddleocr"` (`:96`).

`paddle_ocr.py:18` keeps a shared `httpx.AsyncClient` keyed by timeout with
`Limits(keepalive_connections=16, max_connections=32)`. The pipeline, by contrast, builds a
per-batch client with `max_keepalive_connections=batch_size` and
`max_connections=batch_size*2` (`ocr_pipeline.py:48-49`).

## Pydantic schemas

`app/models/document.py`: `Subheading:7` (`title: Optional[str]`, `paragraphs: List[str]`),
`Paragraph:14`, `Section:25` (unused by any router), `Chapter:32` (`title: str`,
`paragraphs: List[str]`, `subheadings: Optional[List[Subheading]]`,
`focusEligible: Optional[bool] = True`), `NormalizedBook:54` (`title`, `author`,
`kind: Literal["PDF","EPUB","TEXT","MARKDOWN"]`, `chapters`), `ParseResponse:63`,
`DocumentValidationResponse:75`.

`app/models/ocr.py`: `OCRPageResult:7`, `OCRDocumentResponse:30`, `OCRBatchResponse:47`,
`HFModelInfo:59`, `OCRModelListResponse:70`, and `OCRStatusResponse:80` — **dead**, it is absent
from `models/__init__.py:29-49` and referenced by no router.

`app/models/reader.py`: `Note:7`, `Bookmark:19`, `ReadingProgress:29` (**unused**),
`SegmentRequest:41` (`text` max 200000, `language` default `"en"`), `SegmentResponse:48`,
`ReadingTimeRequest:59` (`wordsPerMinute` default 220, gt 0), `ReadingTimeResponse:69`,
`ExportPayload:81` (`version="1.0"`, `progressPercent` 0-100).

The client-side shape of the book contract is in [[Normalized Book Contract]].

## Known dead and unused backend code

State this plainly rather than letting it look like coverage:

| Item | Evidence |
| --- | --- |
| `OCRStatusResponse` | not exported from `models/__init__.py`, no router references it |
| `ReadingProgress` | defined, never used |
| `Section` | defined, no router returns it |
| `openai`, `sse-starlette`, `huggingface_hub` | declared in `backend/requirements.txt:11,:12,:7`, zero imports repo-wide |
| `settings.ocr_engine_url` | `config.py:56`, zero `settings.<name>` consumers |
| `settings.host` | `config.py:24`, zero consumers |
| `settings.hf_token` | `config.py:53`, zero consumers |
| compose `DEBUG=false` | `docker-compose.yml:39` sets `DEBUG`, but `config.py:23` declares `validation_alias="BOOKFLOW_DEBUG"` with `extra="ignore"`, so it is silently dropped and debug is always `False` |
| `defusedxml` | optional-imported at `document_service.py:15` but not declared in `requirements.txt` |
| `backend/Dockerfile` | not referenced by `docker-compose.yml`; only works for `docker build backend/` |

## Environment variables

Full key list, consumers, and the gaps, are in [[Environment Config]]. The four that matter for
this note:

| Variable | Why |
| --- | --- |
| `GEMINI_API_KEY` | **required** for `/api/reading-lens`; absent, the route 503s. Not in `.env.example`. |
| `PADDLEOCR_URL` | full `/ocr` endpoint of the worker |
| `OCR_MODEL` | default `Qwen/Qwen2-VL-7B-Instruct` (`main.py:71`) |
| `HF_INFERENCE_URL` | default `https://router.huggingface.co/v1/chat/completions` (`main.py:73-76`) |

## Related

- [[Backend Architecture]] for the module layout behind these routes
- [[Environment Config]] for every key and its consumer
- [[OCR Decision Tree]] for how a page chooses its extraction path
- [[SSE Progress Streaming]] for the client half of these streams
- [[Reading Lens]] for the client-side consent short-circuit
- [[Privacy Model]] for what leaves the device
- [[API Reference MOC]]