---
title: Environment Config
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, api, environment, configuration]
source-files: [.env.example, backend/app/core/config.py, backend/main.py, backend/ocr_worker.py, backend/run.py, docker-compose.yml, vite.config.js, src/features/document-import/lib/backendOcrFallback.js, src/features/reader/components/FocusBarAmbient.jsx]
---

# Environment Config

Every setting that changes between a laptop, a server, and a deployment.

Verified 2026-10-02 against `.env.example`, `backend/app/core/config.py`, `backend/main.py`, and
`backend/ocr_worker.py`. Create `backend/.env` locally and keep it untracked; `.gitignore` has
`.env*` with an explicit `!.env.example` exception.

## `.env.example` exists and is a bare key list

The file is committed and contains **21 keys**, one per line, with **no comments and no values**.
It documents *which* keys exist, not what they default to. Defaults live in code.

| # | Key |
| --- | --- |
| 1 | `BOOKFLOW_DEBUG` |
| 2 | `CORS_ORIGINS` |
| 3 | `ENVIRONMENT` |
| 4 | `HF_API_KEY` |
| 5 | `HF_API_TIMEOUT` |
| 6 | `HF_INFERENCE_URL` |
| 7 | `HF_MAX_RETRIES` |
| 8 | `HF_MAX_TOKENS` |
| 9 | `HF_TOKEN` |
| 10 | `HOST` |
| 11 | `MAX_BATCH_IMAGES` |
| 12 | `MAX_PDF_PAGES_OCR` |
| 13 | `MAX_UPLOAD_SIZE_MB` |
| 14 | `OCR_MODEL` |
| 15 | `OCR_PROMPT` |
| 16 | `PADDLEOCR_DEVICE` |
| 17 | `PADDLEOCR_MAX_IMAGE_MB` |
| 18 | `PADDLEOCR_PORT` |
| 19 | `PADDLEOCR_PRELOAD_PROFILES` |
| 20 | `PADDLEOCR_TIMEOUT` |
| 21 | `PADDLEOCR_URL` |

`HOST` is the only key on this list with **zero consumers**. `backend/app/core/config.py:24`
declares `host`, but nothing reads `settings.host`.

## Keys the code reads that `.env.example` is missing

This is a real gap. These are documented nowhere in the template:

| Key | Declared at | Consumer |
| --- | --- | --- |
| `GEMINI_API_KEY` | `config.py:73` | **Required** for the Reading Lens endpoint. `backend/app/routers/reader.py:347` reads `settings.gemini_api_key` |
| `GEMINI_BASE_URL` | `config.py:74` | Default `https://generativelanguage.googleapis.com/v1beta` |
| `GEMINI_MODEL` | `config.py:78` | Default `gemini-2.5-flash` |
| `GEMINI_FALLBACK_MODEL` | `config.py:79` | Default `gemini-2.5-flash-lite` |
| `GEMINI_TIMEOUT_SECONDS` | `config.py:82` | Default `12.0` |
| `OCR_ENGINE_URL` | `config.py:56` | **Zero consumers repo-wide.** Declared, defaulted to `http://ocr-engine:8000/v1`, and read by nothing |
| `APP_NAME` | `config.py:20` | Not in the template. Default `Bookflow Backend` |
| `APP_VERSION` | `config.py:21` | Not in the template. Default `2.0.0` |
| `PORT` | `config.py:25` | Not in the template. Default `8000` |

A developer who copies `.env.example` and sets up the Reading Lens will find the endpoint failing
with an empty key, and nothing in the template hints at the missing name.

## Backend settings and their defaults

`Settings` in `backend/app/core/config.py` uses `env_file=".env"`, `case_sensitive=False`, and
`extra="ignore"`.

| Setting | Default | Alias |
| --- | --- | --- |
| `debug` | `False` | `BOOKFLOW_DEBUG` |
| `environment` | `development` | `ENVIRONMENT` |
| `cors_origins` | localhost and 127.0.0.1 on ports 5173 and 3000 | `CORS_ORIGINS` (comma-split by a validator) |
| `hf_token` / `hf_api_key` | empty | Either name; each falls back to the other via `os.getenv` |
| `hf_inference_url_template` | `https://router.huggingface.co/v1/chat/completions` | `HF_INFERENCE_URL` |
| `hf_max_tokens` | `2048` | `HF_MAX_TOKENS` |
| `hf_api_timeout` | `60.0` | `HF_API_TIMEOUT` |
| `hf_max_retries` | `3` | `HF_MAX_RETRIES` |
| `ocr_model` | `Qwen/Qwen2-VL-7B-Instruct` | `OCR_MODEL` |
| `ocr_prompt` | extraction instruction | `OCR_PROMPT` |
| `paddleocr_url` | empty | `PADDLEOCR_URL` |
| `paddleocr_timeout` | `60.0` | `PADDLEOCR_TIMEOUT` |
| `max_upload_size_mb` | `50` | `MAX_UPLOAD_SIZE_MB` |
| `max_batch_images` | `32` | `MAX_BATCH_IMAGES` |
| `max_pdf_pages_ocr` | `1000` | `MAX_PDF_PAGES_OCR` |

The default `OCR_PROMPT`:

```text
Extract all text from this page exactly as written. Return only the extracted text
in Markdown, preserving reading order, headings, tables, and line breaks.
```

`backend/main.py` keeps its own constants rather than reading `Settings`, so its values can drift:
`DEFAULT_BATCH_SIZE = 16` (`:88`), `MAX_RETRIES = 3` (`:89`), `MAX_UPLOAD_MB = 50` (`:90`), and
`HF_MAX_TOKENS` from the environment with default `2048` (`:78`). Note the batch-size mismatch:
`backend/main.py` defaults to 16 while `config.py` declares `max_batch_images` as 32.

## Known bug: the compose `DEBUG` variable is silently dropped

`docker-compose.yml:39` sets `DEBUG=false` for the FastAPI service. That variable has no effect:

- `config.py:23` declares `validation_alias="BOOKFLOW_DEBUG"`, so the field only reads
  `BOOKFLOW_DEBUG`.
- `model_config` sets `extra="ignore"` (`:15`), so an unknown `DEBUG` is discarded without error.

**Debug is therefore always `False` in the container.** To change it, the variable must be
renamed to `BOOKFLOW_DEBUG`. This is a configuration trap, not a documented intent.

## PaddleOCR worker reads different names than compose

The worker does **not** read the `PADDLEOCR_*` names. `backend/ocr_worker.py` uses:

| Variable | Default | Line |
| --- | --- | --- |
| `OCR_MAX_IMAGE_MB` | `20` | `:26` |
| `OCR_DEVICE` | `cpu` | `:27` |
| `OCR_PRELOAD_PROFILES` | `small` | `:30` |

So `PADDLEOCR_DEVICE`, `PADDLEOCR_MAX_IMAGE_MB`, and `PADDLEOCR_PRELOAD_PROFILES` in the
template and in compose do not configure the worker unless they are mapped to the `OCR_*` names.
`PADDLEOCR_PORT` and `PADDLEOCR_URL` are consumed by the client side, not the worker.

## Frontend variables

Searching `src/` for `import.meta.env` yields exactly two project variables:

| Variable | Effect |
| --- | --- |
| `VITE_API_URL` | Base URL for backend calls. Unset means the Vite `/api` proxy handles it. Read in `src/components/ocrErrors.js:3` and `src/features/document-import/lib/backendOcrFallback.js:4` |
| `VITE_SPLINE_SCENE` | Scene URL for the ambient reader bar. Read at `src/features/reader/components/FocusBarAmbient.jsx:12`. **When unset the Spline runtime is never fetched at all** |

`import.meta.env.BASE_URL` (`src/features/document-import/lib/pdfDocument.js:3`) and
`import.meta.env.DEV` (`src/shared/components/AmbientDustCanvas.jsx:1019`) are Vite built-ins,
not project configuration.

In `backendOcrFallback.js`, `apiBase()` strips a trailing slash and returns an empty string when
unset; `displayBase()` falls back to `http://localhost:8000` for human-readable error messages.

## Ports

| Service | Port | Notes |
| --- | --- | --- |
| Vite dev server | `3000` | `npm run dev`, bound to `0.0.0.0` |
| FastAPI backend | `8000` | `backend/Dockerfile` and `backend/run.py` |
| Vite preview | `4173` by default | e2e overrides to `4175` with `--strictPort` |
| Docker PaddleOCR | see [[Docker OCR]] | Self-hosted profile |

The dev proxy maps `/api` to `http://127.0.0.1:8000` with `changeOrigin: true`.

## Secrets discipline

| Rule | Reason |
| --- | --- |
| Tokens live only in backend `.env` | Never in the browser bundle |
| Never commit `.env` | `.gitignore` has `.env*` with `!.env.example` |
| Never log tokens, headers, page text, or image bytes | Privacy invariant |
| `GEMINI_API_KEY` is a deployment secret | Rotate independently of code |
| Rotate any provider credential that appears in a transcript, log, or commit | Treat transcripts as leak surfaces |

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

### Reading Lens, the one consented egress

```text
GEMINI_API_KEY configured. Without it the endpoint cannot reach a provider.
The reader must additionally grant consent per session, and the backend returns 403 otherwise.
```

## Verification

```bash
curl http://127.0.0.1:8000/api/health
curl -i -H "Origin: http://localhost:3000" http://127.0.0.1:8000/api/health
```

`backend/Dockerfile` health-checks `/health`, not `/api/health`. Then confirm in the browser that
a scan job starts and progress streams.

Related: [[Backend Endpoints]], [[Testing Pipeline]], [[Backend Architecture]], [[Reading Lens]].