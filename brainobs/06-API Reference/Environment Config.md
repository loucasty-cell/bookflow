---
title: Environment Config
type: reference
status: verified
updated: 2026-09-25
tags: [bookflow, api, environment, configuration]
source-files: [backend/main.py, vite.config.js, src/features/document-import/lib/backendOcrFallback.js]
---

# Environment Config

Every setting that changes between a laptop, a server, and a deployment.

Note: variable names and defaults below are verified against `backend/main.py`. A committed
`.env.example` template does not exist in the current tree, so treat this note as the template.
Create `backend/.env` locally and keep it untracked.

## Backend variables

Loaded by `python-dotenv` from `backend/.env`, then `../.env`.

| Variable | Default | Meaning |
| --- | --- | --- |
| `OCR_MODEL` | `Qwen/Qwen2-VL-7B-Instruct` | Vision model id for remote OCR |
| `HF_TOKEN` | empty | Provider token, falls back to `HF_API_KEY` |
| `HF_API_KEY` | empty | Alternative token variable name |
| `HF_INFERENCE_URL` | `https://router.huggingface.co/v1/chat/completions` | OpenAI-compatible endpoint |
| `PADDLEOCR_URL` | empty | Self-hosted PaddleOCR base URL |
| `HF_MAX_TOKENS` | `2048` | Response length cap |
| `PADDLEOCR_TIMEOUT` | `60.0` | PaddleOCR request timeout in seconds |
| `OCR_ENGINE_URL` | `http://ocr-engine:8000/v1` | Self-hosted vLLM engine base URL |
| `OCR_PROMPT` | extraction instruction | Prompt sent with each page image |
| `CORS_ORIGINS` | `localhost` and `127.0.0.1` ports 5173 and 3000 | Allowed browser origins |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

Backend processing limits are code constants rather than environment variables:

| Constant | Value | Meaning |
| --- | --- | --- |
| `max_upload_size_mb` | `50` | Server-side upload ceiling; matches `backend/main.py` |
| `max_batch_images` | `32` | Maximum images per batch request |
| `max_pdf_pages_ocr` | `1000` | Maximum pages OCRed per PDF |

The default `OCR_PROMPT`:

```text
Extract all text from this page exactly as written. Return only the extracted text
in Markdown, preserving reading order, headings, tables, and line breaks.
```

## Frontend variables

| Variable | Effect |
| --- | --- |
| `VITE_API_URL` | Base URL for backend calls. Empty uses the Vite `/api` proxy |

`apiBase()` in `backendOcrFallback.js` reads `VITE_API_URL`, strips a trailing slash, and returns
an empty string when unset so the dev proxy handles it. `displayBase()` falls back to
`http://localhost:8000` for human-readable error messages.

## Ports

| Service | Port | Notes |
| --- | --- | --- |
| Vite dev server | `3000` | `npm run dev`, bound to `0.0.0.0` |
| FastAPI backend | `8000` | `start_backend.bat` or uvicorn |
| Vite preview | `4173` default | `npm run preview` |
| Docker PaddleOCR | see Docker note | Self-hosted profile |

The dev proxy maps `/api` to `http://127.0.0.1:8000` with `changeOrigin: true`.

Detail: [[Dev Setup]], [[Docker OCR]].

## Secrets discipline

| Rule | Reason |
| --- | --- |
| Tokens live only in backend `.env` | Never in the browser bundle |
| Never commit `.env` | `.env.example` documents the keys instead |
| Never log tokens, headers, page text, or image bytes | Privacy invariant |
| Use a short-lived or scoped token where possible | Limits blast radius |
| Treat provider keys as deployment secrets | Rotate independently of code |

Detail: [[Privacy Model]], [[Invariants]].

## Profiles

### Frontend only, fully private

```text
No backend, no tokens. This is the default configuration.
Digital PDFs, EPUB, TXT, Markdown, and local English OCR all work.
```

### Backend with self-hosted OCR

```text
PADDLEOCR_URL configured, no token required.
Preferred accelerated path: deterministic, self-hosted, no per-page bill.
```

### Explicit accelerated OCR with provider failover

```text
OCR_MODEL and HF_TOKEN configured.
The user starts the optional accelerated scan; inside that job, self-hosted OCR can fall back to
the configured Hugging Face route when necessary.
```

## Verification

```bash
# Backend reachable
curl http://127.0.0.1:8000/api/health

# CORS correct for the dev origin
curl -i -H "Origin: http://localhost:3000" http://127.0.0.1:8000/api/health
```

Then confirm in the browser that a scan job starts and progress streams.

Related: [[Backend Endpoints]], [[Testing Pipeline]], [[Backend Architecture]].