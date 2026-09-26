---
title: Backend Architecture
type: concept
status: verified
updated: 2026-09-26
tags: [bookflow, architecture, backend, fastapi]
source-files: [backend/main.py, backend/app/main.py, backend/app/core/config.py, backend/app/routers/ocr.py, backend/app/services/ocr_service.py, backend/requirements.txt]
---

# Backend Architecture

## Purpose

An optional FastAPI service that accelerates scanned-page OCR and exposes document, reader,
and health utilities. It is never required for reading digital documents, and the browser only
contacts it after the user explicitly starts the accelerated OCR flow.

## Application layout

```text
backend/
  main.py                           FastAPI app, OCR scan engine, job store, SSE
  run.py                            Launcher script
  start_backend.bat                 Windows setup and launch
  requirements.txt                  Python dependencies
  app/
    main.py                         App factory variant
    core/config.py                  Settings and environment
    models/                         Pydantic v2 schemas: document, ocr, reader
    routers/                        health, ocr, documents, reader
    services/                       ocr_service, huggingface_ocr, paddle_ocr,
                                    document_service, text_service
  tests/                            Pytest suite (75 tests across 10 test modules)
  Dockerfile.ocr                    PaddleOCR container
```

`main.py` is the runnable OCR entrypoint used by the current launch path. It also imports the
modular `app.routers` package for document, reader, and OCR routes, so the backend refactor is
incremental rather than a clean replacement. `backend/app/main.py` remains a separate modular app
factory for deployments that target `app.main:app`.

## Runtime configuration

Read from the environment with `python-dotenv` loading `backend/.env` then `../.env`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `OCR_MODEL` | `Qwen/Qwen2-VL-7B-Instruct` | Vision model id used for remote OCR |
| `HF_TOKEN` | empty (falls back to `HF_API_KEY`) | Provider credential |
| `HF_INFERENCE_URL` | `https://router.huggingface.co/v1/chat/completions` | OpenAI-compatible route |
| `PADDLEOCR_URL` | empty | Self-hosted PaddleOCR endpoint |
| `HF_MAX_TOKENS` | `2048` | Response cap |
| `OCR_PROMPT` | extraction instruction | Prompt sent with each page image |
| `CORS_ORIGINS` | ports 5173 and 3000 | Allowed browser origins |

Detail: [[Environment Config]].

## Execution constants

| Constant | Value | Reason |
| --- | --- | --- |
| `DEFAULT_BATCH_SIZE` | `16` pages | Bounds peak memory on long books |
| `RENDER_DPI` | `96` | Legible for OCR, small enough to stream |
| `RENDER_SCALE` | `96 / 72 = 1.3333` | PyMuPDF zoom factor |
| `MAX_RETRIES` | `3` | Survives cold starts and transient provider errors |
| `THREAD_POOL_WORKERS` | `min(32, cpu_count * 4)` | Caps rasterization parallelism |
| `MAX_UPLOAD_MB` | `50` | Matches the modular settings limit |

## Concurrency model

The event loop must stay free. CPU-bound rasterization goes to a module-level
`ThreadPoolExecutor`, and network work uses a persistent `httpx.AsyncClient` with bounded
keep-alive connections. This is the difference between a service that scales and one that
stalls under load.

```text
POST /api/ocr/scan
  -> create OCRJob, register in jobs dict
  -> return { job_id, total_pages } immediately
  -> BackgroundTasks runs the pipeline:
       for each batch of 16 pages:
         rasterize pages (ThreadPoolExecutor, 96 DPI)
         try native text first (>= 15 words -> instant)
         dispatch remaining pages to OCR providers
         append results, notify SSE subscribers
       assemble markdown, mark completed, notify
```

## Job lifecycle

```text
processing --> completed
           --> failed
           --> canceled
```

`OCRJob` tracks `job_id`, `filename`, `total_pages`, `current_page`, `pages`, `markdown`,
`total_words`, `error`, timestamps, and the list of `asyncio.Queue` subscribers.

`prune_stale_jobs(ttl_seconds=3600)` removes jobs older than the TTL, or completed jobs older
than 1800 seconds. This is the memory safety valve.

## Error philosophy

- A page failure does not fail the job. Unreadable pages are collected and reported.
- If every page fails, the job fails with the page list in the message.
- On failure the job clears `pages`, `markdown`, and `total_words` so the buffer is released.

This satisfies the invariant that unreadable content must be reported, never silently dropped.

## Type and contract discipline

- All models use Pydantic v2 with `serialization_alias` and `validation_alias` so Python
  snake_case maps cleanly to JSON camelCase.
- Every aliased model sets `model_config = ConfigDict(populate_by_name=True)`.
- Pyright is expected to stay at zero errors against `backend/.venv`.

## Dependencies

`fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`, `python-multipart`, `httpx`,
`huggingface_hub`, `Pillow`, `pypdf`, `PyMuPDF`, `openai`, `sse-starlette`, `beautifulsoup4`,
`pytest`, `pytest-asyncio`, `python-dotenv`.

PyMuPDF is the rasterization engine; `pypdf` is a secondary extraction path; `openai` supports
OpenAI-compatible vision routes; `sse-starlette` complements the manual SSE implementation.

## Test coverage

`backend/tests/` contains 45 tests across `test_health`, `test_text`, `test_documents`, `test_ocr`,
`test_ocr_worker`, `test_accelerated_ocr`, `test_reader`, and `test_config`, with `conftest.py`
providing a test client and sample image fixtures.

Detail: [[Testing Pipeline]], [[Backend OCR Engine]], [[SSE Progress Streaming]].
