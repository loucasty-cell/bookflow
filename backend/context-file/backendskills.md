# Bookflow Backend Skills & Technical Roadmap

Engineering reference, architectural patterns, and planned technical capabilities for the Bookflow FastAPI backend.

---

## 1. Core Implemented Competencies

### 1.1 Asynchronous I/O & Concurrency
- **Non-blocking Request Handling**: FastAPI route handlers run on `uvicorn` ASGI event loop.
- **Bounded Concurrency**: `asyncio.Semaphore(max_concurrency)` prevents network and memory exhaustion during parallel OCR calls.
- **Connection Pooling**: Persistent `httpx.AsyncClient` with custom timeouts and exponential backoff retry logic for the Hugging Face Inference API adapter.
- **Thread Pool Executor**: CPU-bound PyMuPDF page rendering offloaded to a `ThreadPoolExecutor` (up to `min(32, cpu_count * 4)` workers) to avoid blocking the async event loop.
- **vLLM Async Client**: `AsyncOpenAI` client connects to a self-hosted vLLM inference server for high-throughput DeepSeek-OCR-2 batch processing.

### 1.2 In-Memory Document Ingestion
- **Zero-Disk Streaming**: Parses PDFs (`PyMuPDF` primary, `pypdf` fallback), EPUBs (`zipfile` + `beautifulsoup4`), Markdown, and plain text entirely in RAM.
- **Data Contract Conformity**: Emits strict `NormalizedBook` JSON schemas mirroring frontend reader requirements.

### 1.3 Vision OCR Pipeline

#### High-Throughput Visual Scanning (DeepSeek-OCR-2 on vLLM)
- **`POST /api/ocr/scan`**: Accepts a PDF upload, renders pages to 96 DPI JPEG in-memory via PyMuPDF, and dispatches concurrent batches (default 16 pages) to `deepseek-ai/DeepSeek-OCR-2` on a vLLM inference server.
- **Native Text Fast Path**: Pages with 15+ words of selectable text skip rasterization entirely and resolve in sub-millisecond latency.
- **Exponential Backoff**: Failed vLLM calls retry up to 3 times with `0.4 * 2^(attempt-1)` second delays, then fall back to native text when available.
- **SSE Progress Streaming**: `GET /api/ocr/progress/{job_id}` provides real-time Server-Sent Events with per-page updates, pages-per-second throughput, word counts, and heartbeat keepalives.
- **Background Job Architecture**: OCR jobs run as FastAPI `BackgroundTasks`, tracked in an in-memory thread-safe store with `asyncio.Lock` and subscriber queues.
- **Structured Markdown Output**: Completed jobs produce ordered Markdown with page separators and embedded page comments.

#### Hugging Face Inference API Adapter (Legacy)
- **Image Normalization**: Pillow pipeline handles EXIF orientation correction, RGBA-to-RGB conversion, and aspect-preserving downscale (max 2048px).
- **Model Adapter**: Unified parser extracting structured text from diverse Vision model outputs (`TrOCR`, `GOT-OCR 2.0`, `Nougat`).
- **Hybrid Scanned PDF Processing**: Detects sparse text per page; selectively triggers OCR only on image-heavy pages while preserving native text.

### 1.4 Text Analytics & Boundary Detection
- **Abbreviation-Aware Segmentation**: Regex engine protects honorifics (Mr., Dr., Prof.), acronyms, and decimal numbers from premature sentence splitting.
- **Reading Duration Analytics**: Computes normalized word counts and standard 220 WPM reading-time metrics.

### 1.5 Type Safety & Development Tooling
- **Pydantic v2 Alias Pattern**: All models use `serialization_alias` + `validation_alias` (not bare `alias`) so Python code uses snake_case constructors while JSON responses serialize to camelCase for the frontend.
- **Virtual Environment**: `backend/.venv` (Python 3.12) with all dependencies from `requirements.txt`.
- **Static Type Checking**: Pyright configured via `pyrightconfig.json` at workspace root, targeting the `.venv` interpreter. Zero errors enforced.
- **Automated Testing**: `pytest` with 16+ tests covering routing, parsing, segmentation, and mock OCR.

---

## 2. Architectural Design Patterns

```text
+----------------------------------------------------------------------+
|                          FastAPI Routers                              |
|  - Request validation via Pydantic v2                                |
|  - Multipart upload streaming & header token extraction              |
+------------------------------+---------------------------------------+
                               |
+------------------------------v---------------------------------------+
|                     Service Layer                                     |
|  - main.py: vLLM OCR pipeline, SSE broadcasting, job management      |
|  - HuggingFaceOCRService: Image pipeline & HF HTTP calls (legacy)    |
|  - OCRService: Batch & hybrid PDF orchestrator                       |
|  - DocumentService: Format parsing & normalization                   |
|  - TextService: Sentence boundaries & reading time metrics           |
+------------------------------+---------------------------------------+
                               |
+------------------------------v---------------------------------------+
|                     Data Contracts Layer                              |
|  - Pydantic v2 schemas with serialization_alias / validation_alias   |
|  - NormalizedBook, OCRPageResult, OCRDocumentResponse                 |
|  - Standardized JSON error response envelope                         |
+----------------------------------------------------------------------+
```

---

## 3. API Endpoints

### High-Throughput OCR (main.py)
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/ocr/scan` | Upload PDF, start background OCR job with SSE streaming |
| `GET` | `/api/ocr/progress/{job_id}` | Real-time SSE stream of page-by-page progress |
| `GET` | `/api/ocr/job/{job_id}` | Polling snapshot of job status and processed pages |
| `GET` | `/api/ocr/result/{job_id}` | Final Markdown document for completed jobs |
| `GET` | `/api/health` | Service health check with engine configuration |

### Legacy Routers (app/routers/)
| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/ocr/image` | Single image OCR via Hugging Face Inference API |
| `POST` | `/api/ocr/batch` | Concurrent batch image OCR |
| `POST` | `/api/ocr/pdf` | Hybrid scanned PDF OCR |
| `GET` | `/api/ocr/models` | Available Hugging Face Vision model list |
| `POST` | `/api/documents/parse` | Multi-format document parsing |
| `POST` | `/api/documents/validate` | File type and size validation |
| `POST` | `/api/reader/segment` | Sentence boundary segmentation |
| `POST` | `/api/reader/reading-time` | Reading duration estimate |

---

## 4. Next Feature Updates (Backend-Only Roadmap)

### Phase 1: Local ONNX Runtime / Triton Inference
- **Objective**: Provide air-gapped, zero-network OCR acceleration.
- **Tech**: `onnxruntime` with INT8 quantized `trocr-small-printed` or `got-ocr2.onnx`.
- **Benefit**: Fast offline scanning without external vLLM or Hugging Face API dependencies.

### Phase 2: Layout & Reading-Order Analysis
- **Objective**: Correct multi-column PDF reading flow (academic journals, two-column textbooks).
- **Tech**: Bounding-box sort via lightweight vision model or PyMuPDF layout stream coordinates.
- **Benefit**: Eliminates sentence interleaving across columns.

### Phase 3: Multilingual Sentence Segmentation
- **Objective**: Support non-Latin sentence boundaries (CJK characters, Arabic, Cyrillic).
- **Tech**: Language detection via `fasttext-wheel` or `langdetect` + specialized rule tokenizers (`jieba`, `spacy-pkuseg`).

### Phase 4: In-Memory SHA-256 OCR Cache
- **Objective**: Deduplicate OCR inference across repeated scans or reloaded pages.
- **Tech**: In-memory LRU cache (`cachetools` / `OrderedDict`) keyed by image content SHA-256 hash.
- **Benefit**: Zero-latency re-parsing of previously processed pages.

### Phase 5: Containerization & Cloud-Native Packaging
- **Objective**: Single-command container deployment.
- **Tech**: Multi-stage `Dockerfile` with distroless/slim Python base and Docker Compose configuration.

---

## 5. Verification & Testing Standards

- **Unit & Service Tests**: `pytest -v backend/tests/` covering routing, parsing, segmentation, and mock OCR.
- **Type Compliance**: Pyright strict mode with zero errors; Pydantic v2 `serialization_alias` + `validation_alias` pattern enforced across all models.
- **Security Baseline**: No API keys hardcoded in source; all secrets ingested via environment variables.
- **Virtual Environment**: `backend/.venv` (Python 3.12) with dependencies installed from `requirements.txt`.
