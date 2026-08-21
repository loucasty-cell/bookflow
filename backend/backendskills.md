# Bookflow Backend Architecture & Docker Engineering Standards

Comprehensive technical reference, FastAPI engineering patterns, Docker workflows, and multi-tiered OCR specifications for the Bookflow backend.

---

## 1. Technology Stack & Framework Architecture

### 1.1 Core Asynchronous Runtime
- **FastAPI**: Modern, high-performance web framework based on Starlette and Pydantic v2.
- **Uvicorn ASGI Event Loop**: Asynchronous non-blocking concurrency for high-throughput HTTP and SSE streaming.
- **Python 3.11 / 3.12 Compatibility**: Type safety verified through strict Pyright configuration.
- **Pydantic v2 Schemas**: Strict data contracts using `validation_alias` and `serialization_alias` to seamlessly bridge camelCase frontend payloads with snake_case Python models.

### 1.2 Docker & Containerization Workflow
The backend supports both bare-metal execution and multi-container Docker Compose orchestration:

```text
+-----------------------------------------------------------------------------------------------+
|                                    Docker Compose Network                                     |
|                                                                                               |
|   +--------------------------+                         +----------------------------------+   |
|   |    bookflow-paddleocr    |                         |         bookflow-fastapi         |   |
|   |  (PaddleX OCR Worker)    | <---------------------- |        (FastAPI Gateway)         |   |
|   |  - Port: 8080            |   POST /ocr             |  - Port: 8000                    |   |
|   |  - PaddleOCR Models Cache|                         |  - PyMuPDF ThreadPool            |   |
|   +--------------------------+                         |  - SSE Event Streaming           |   |
|                                                        |  - Multi-tier Routing Failover   |   |
|   +--------------------------+                         +----------------------------------+   |
|   |   bookflow-ocr-engine    |                                          ^                     |
|   |   (vLLM / Qwen2-VL)      | <========================================+                     |
|   |   - Port: 8000 / GPU     |   /v1/chat/completions                   |                     |
|   +--------------------------+                                   [Client Requests]            |
+-----------------------------------------------------------------------------------------------+
```

#### Production `Dockerfile` (`backend/Dockerfile`):
- Base image: `python:3.11-slim`
- Native OS libraries: `libgl1`, `libglib2.0-0` (required for PyMuPDF rasterization and Pillow image handling), `curl`
- Layer caching: `backend/requirements.txt` installed before copying source code
- Built-in Healthcheck: `HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1`
- Entrypoint: `uvicorn main:app --host 0.0.0.0 --port 8000`

#### PaddleOCR Worker `Dockerfile` (`backend/Dockerfile.ocr`):
- Base image: `python:3.11-slim` with PaddleOCR/PaddleX dependencies
- Exposes port `8080` with `/ocr` and `/health` endpoints
- Volume mount: `paddleocr_models:/root/.paddlex` for offline weight caching

#### Multi-Container `docker-compose.yml`:
- **`bookflow-paddleocr`**: Runs PaddleOCR worker with automatic profile preloading and `/health` probe.
- **`bookflow-fastapi`**: Gateway routing requests to `http://bookflow-paddleocr:8080/ocr` first, falling back to Hugging Face / vLLM GPU vision endpoints when needed.

---

## 2. Multi-Tiered OCR Pipeline & High-Concurrency Scaling

### 2.1 Three-Tier Routing Strategy
1. **Tier 1: Microsecond Native Text Fast-Path**:
   - Checks if PDF pages contain selectable text ($\ge 15$ words) using PyMuPDF.
   - Bypasses visual rasterization entirely, returning high-accuracy native text in $< 1\text{ ms}$.
2. **Tier 2: PaddleOCR Direct Service**:
   - If `PADDLEOCR_URL` is set, routes image payloads to the local/cluster PaddleOCR HTTP endpoint.
3. **Tier 3: Vision Router (vLLM / Hugging Face Inference)**:
   - Uses OpenAI-compatible `/v1/chat/completions` payload with base64 data URLs for vision models (e.g. `Qwen/Qwen2-VL-7B-Instruct`, `deepseek-ai/DeepSeek-OCR-2`).
   - Handles HTTP 503 model-loading cold starts by reading `estimated_time` with adaptive backoff.
   - Handles HTTP 429 rate limits with exponential backoff and jitter.

### 2.2 Thread Pool CPU Offloading
- PDF page rendering (96–144 DPI) and image conversions are offloaded to `concurrent.futures.ThreadPoolExecutor(max_workers=min(32, cpu_count * 4))`.
- Guarantees zero blocking of the main ASGI async event loop during intensive document rasterization.

### 2.3 Real-Time Server-Sent Events (SSE) & Stream Management
- `GET /api/ocr/progress/{job_id}` streams real-time status with current page, total pages, completion percent, velocity (pages/sec), and processed page text.
- Sends periodic `: keepalive\n\n` comments every 8 seconds to prevent mobile browser and reverse-proxy timeouts.
- Supports active job cancellation (`POST /api/ocr/cancel/{job_id}`) to terminate batch loops and release memory immediately.

### 2.4 High-Volume Job Store & Memory Safety (500+ Users)
- In-memory job state managed via thread-safe `asyncio.Lock`.
- Automated `prune_stale_jobs` routine purges completed and failed job buffers after a 1-hour TTL, preventing unbounded memory accumulation under heavy concurrent workloads.
- Persistent `httpx.AsyncClient` with bounded connection pooling (`max_keepalive_connections=32`, `max_connections=64`).

---

## 3. Behavioral AI & Privacy-Preserving Social Endpoints

### 3.1 4-Minute Drop-Off Intervention Engine (`POST /api/ai/intervention`)
- Telemetry detects attention decay (>40% velocity drop over 30s) near minute 3.5–4.0.
- Generates a concise, 1-sentence cognitive anchor using the Curiosity Gap or Loss Aversion to re-engage the reader.

### 3.2 In-Margin Social Layer (`/api/social/resonance`, `/api/social/reactions`)
- Uses SHA-256 paragraph fingerprinting (`hash_paragraph(text)`).
- Readers of identical book editions share thought whispers and highlight resonance without storing raw book text in centralized cloud databases.

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/ocr/scan` | Initiate asynchronous PDF OCR scan, return job ID and stream URL |
| `GET` | `/api/ocr/progress/{job_id}` | Real-time SSE progress stream with 8s heartbeat keepalives |
| `POST` | `/api/ocr/cancel/{job_id}` | Abort active OCR job and free memory buffers |
| `GET` | `/api/ocr/job/{job_id}` | Polling snapshot of job status and extracted pages |
| `GET` | `/api/ocr/result/{job_id}` | Retrieve compiled Markdown output for a completed job |
| `POST` | `/api/ai/intervention` | Generate curiosity-gap or loss-aversion reading continuation hooks |
| `GET` | `/api/social/resonance/{hash}`| Retrieve in-margin community thought whispers |
| `POST` | `/api/social/reactions` | Post time-shifted reader reactions anchored to paragraph hashes |
| `GET` | `/health` / `/api/health` | Health check endpoint for container probes and load balancers |

---

## 5. Verification & Testing Standards

Run the backend verification suite before deploying:

```bash
# 1. Pyright static type checking
npx pyright

# 2. Pytest automated test suite (34 tests)
pytest backend/tests/ -v

# 3. Docker build smoke test
docker build -t bookflow-fastapi -f Dockerfile .
```
