# Bookflow Backend Architecture & Engineering Standards

Comprehensive technical reference, architectural patterns, and production engineering capabilities for the Bookflow FastAPI backend.

---

## 1. Core Implemented Architecture

### 1.1 Asynchronous I/O & Non-Blocking Concurrency
- **Uvicorn ASGI Event Loop**: Fully asynchronous route execution handling high-throughput concurrent I/O.
- **Bounded Batch Processing**: Bounded async execution (`asyncio.gather` with batch slices) preventing network saturation and rate limit spikes.
- **Thread Pool CPU Offloading**: CPU-intensive PyMuPDF page rasterization and text extraction offloaded to `concurrent.futures.ThreadPoolExecutor(max_workers=min(32, cpu_count * 4))` to ensure zero event loop lag.
- **Persistent HTTP Client**: Connection-pooled `httpx.AsyncClient` with custom timeouts, header customization, and exponential backoff retry mechanics.

### 1.2 Optional Remote Vision OCR
- **Provider Preflight**: Checks current Hugging Face provider mappings before uploading scanned page images.
- **Endpoint Flexibility**: Uses the configured serverless provider URL or accepts an exact compatible dedicated Hugging Face endpoint URL without appending a model path.
- **Cold-Start & Rate Limit Recovery**: Handles HTTP 503 (model loading) by reading `estimated_time` with adaptive sleep, and backs off gracefully on HTTP 429 rate limits.
- **Native Text Microsecond Fast-Path**: Selectable PDF pages with >= 15 words bypass visual rasterization, returning native text in < 1ms to process 500+ page books rapidly.
- **Token Ingestion Flexibility**: Supports API tokens from environment variables (`HF_TOKEN` / `HF_API_KEY`), request forms (`api_key`), or headers (`Authorization: Bearer`, `X-HF-Token`).

### 1.3 Real-Time Server-Sent Events (SSE) & Job Lifecycle
- **Progress Broadcasting**: `GET /api/ocr/progress/{job_id}` streams real-time status with current page, total pages, percent completion, pages-per-second velocity, word count metrics, and the latest processed page snapshot.
- **Heartbeat Keepalive**: Transmits periodic `: keepalive\n\n` comments every 8 seconds to prevent mobile browser and proxy connection drops.
- **Active Job Cancellation**: `POST /api/ocr/cancel/{job_id}` allows immediate client abort, terminating ongoing batch loops, cleaning memory buffers, and broadcasting termination events.
- **Thread-Safe In-Memory Store**: Job states managed via `asyncio.Lock` with per-job subscriber queues and automated memory deallocation upon completion.

---

## 2. Behavioral AI & Cognitive Retention Engines

### 2.1 4-Minute Drop-Off Intervention Engine
- **Psychological Grounding**: Readers frequently encounter a working-memory friction point around minute 3.5-4.0, prompting task-switching to short-form dopamine loops (TikTok, Instagram).
- **Telemetry & Drop-Off Detection**:
  - Telemetry monitors reading velocity decay (>40% drop over 30s) or repeated scroll oscillation near the 4-minute window.
  - The backend evaluates paragraph context against upcoming narrative/conceptual arcs to generate micro-interventions.
- **Prompt Architecture (`POST /api/ai/intervention`)**:
  ```text
  [System Role]
  You are an expert cognitive reading retention architect. The user is experiencing attention fatigue at minute 3:45 of reading. Your goal is to surface an irresistible, 1-sentence cognitive anchor that hooks their attention into the next 2 paragraphs using either a Curiosity Gap or Loss Aversion.

  [Context Input]
  - Book Title: {book_title}
  - Current Paragraph: {current_paragraph_text}
  - Next Paragraphs: {upcoming_paragraphs_text}
  - Reading Momentum: {session_duration_seconds}s ({words_read} words completed)

  [Constraints]
  - Tone: Calm, intellectual, urgent yet non-gimmicky.
  - Length: Maximum 14 words.
  - Output Format: Strict JSON schema.

  [Response Schema]
  {
    "hook_type": "curiosity_gap" | "loss_aversion",
    "hook_text": "In 4 sentences, the author dismantles the exact premise you just accepted.",
    "time_to_pivot_seconds": 45
  }
  ```

### 2.2 Asynchronous In-Margin Social Engine
- **Paragraph Fingerprinting**: Privacy-first SHA-256 hashing of normalized paragraph text (`hash_paragraph(text)`), enabling readers of identical book versions to share marginalia without transmitting entire book files to a centralized database.
- **Margin Resonance Aggregation (`GET /api/social/resonance/{paragraph_hash}`)**:
  - Aggregates anonymous highlight density and curated thought whispers.
  - Returns categorized commentary (e.g. "Contrarian Take", "Historical Precedent", "Synthesis").
- **Time-Shifted Reaction Drift (`POST /api/social/reactions`)**:
  - Ingests reader reactions locked to paragraph offsets.
  - Replays reactions to future readers only when they reach the exact focal position, creating a synchronized feeling of co-reading across time.

---

## 3. API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/ocr/scan` | Upload PDF file, initiate asynchronous OCR pipeline, return job ID and stream URL |
| `GET` | `/api/ocr/progress/{job_id}` | Real-time Server-Sent Events (SSE) progress and page delivery stream |
| `POST` | `/api/ocr/cancel/{job_id}` | Cancel an active OCR scanning job and notify connected clients |
| `GET` | `/api/ocr/job/{job_id}` | Polling snapshot of job progress, metadata, and extracted pages |
| `GET` | `/api/ocr/result/{job_id}` | Retrieve complete compiled Markdown document for a completed job |
| `POST` | `/api/ai/intervention` | Generate curiosity-gap or loss-aversion reading continuation hooks |
| `GET` | `/api/social/resonance/{hash}`| Retrieve in-margin thought whispers and highlight resonance |
| `POST` | `/api/social/reactions` | Post time-shifted reader reactions anchored to paragraph hashes |
| `GET` | `/health` / `/api/health` | Service health status, active OCR model, and token configuration state |

---

## 4. Code Quality & Verification Standards

- **Static Type Checking**: Strict Pyright type checking targeting Python 3.12 virtual environment.
- **Pydantic v2 Standards**: Strict schema modeling with `serialization_alias` and `validation_alias` for camelCase/snake_case contract consistency.
- **Automated Tests**: Pytest test suite with mock OCR, segmentation, and routing validation (`pytest backend/tests/`).
- **Privacy & Security**: Zero secret logging, strict memory cleanup, and zero disk persistence of document contents.
