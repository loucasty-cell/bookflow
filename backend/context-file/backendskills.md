# Bookflow Backend Skills & Technical Roadmap

Engineering reference, architectural patterns, and planned technical capabilities for the Bookflow FastAPI backend.

---

## 1. Core Implemented Competencies

### 1.1 Asynchronous I/O & Concurrency
- **Non-blocking Request Handling**: FastAPI route handlers run on `uvicorn` ASGI event loop.
- **Bounded Concurrency**: `asyncio.Semaphore(max_concurrency)` prevents network and memory exhaustion during parallel OCR calls.
- **Connection Pooling**: Persistent `httpx.AsyncClient` with custom timeouts and exponential backoff retry logic.

### 1.2 In-Memory Document Ingestion
- **Zero-Disk Streaming**: Parses PDFs (`pypdf`), EPUBs (`zipfile` + `beautifulsoup4`), Markdown, and plain text entirely in RAM.
- **Data Contract Conformity**: Emits strict `NormalizedBook` JSON schemas mirroring frontend reader requirements.

### 1.3 Vision OCR Pipeline
- **Image Normalization**: Pillow pipeline handles EXIF orientation correction, RGBA-to-RGB conversion, and aspect-preserving downscaling (max 2048px).
- **Hugging Face Model Adapter**: Unified parser extracting structured text from diverse Vision model outputs (`TrOCR`, `GOT-OCR 2.0`, `Nougat`).
- **Hybrid Scanned PDF Processing**: Detects sparse text per page; selectively triggers OCR only on image-heavy pages while preserving native text.

### 1.4 Text Analytics & Boundary Detection
- **Abbreviation-Aware Segmentation**: Regex engine protects honorifics (Mr., Dr., Prof.), acronyms, and decimal numbers from premature sentence splitting.
- **Reading Duration Analytics**: Computes normalized word counts and standard 220 WPM reading-time metrics.

---

## 2. Architectural Design Patterns

```text
+-------------------------------------------------------------+
|                      FastAPI Routers                        |
|  - Request validation via Pydantic                          |
|  - Multipart upload streaming & header token extraction     |
+------------------------------+------------------------------+
                               |
+------------------------------v------------------------------+
|                       Service Layer                         |
|  - HuggingFaceOCRService: Image pipeline & HF HTTP calls    |
|  - OCRService: Batch & hybrid PDF orchestrator              |
|  - DocumentService: Format parsing & normalization          |
|  - TextService: Sentence boundaries & reading time metrics  |
+------------------------------+------------------------------+
                               |
+------------------------------v------------------------------+
|                     Data Contracts Layer                    |
|  - Pydantic v2 schemas: NormalizedBook, OCRPageResult       |
|  - Standardized JSON error response envelope                |
+-------------------------------------------------------------+
```

---

## 3. Next Feature Updates (Backend-Only Roadmap)

### Phase 1: Real-Time OCR Streaming (SSE / WebSockets)
- **Objective**: Stream OCR page results progressively rather than waiting for full document completion.
- **Endpoint**: `GET /api/ocr/stream/pdf` using Server-Sent Events (`EventSource`).
- **Benefit**: Immediate first-page rendering for 50+ page scanned books.

### Phase 2: Local ONNX Runtime / Triton Inference
- **Objective**: Provide air-gapped, zero-network OCR acceleration.
- **Tech**: `onnxruntime` with INT8 quantized `trocr-small-printed` or `got-ocr2.onnx`.
- **Benefit**: Fast offline scanning without external Hugging Face API dependencies.

### Phase 3: Layout & Reading-Order Analysis
- **Objective**: Correct multi-column PDF reading flow (academic journals, two-column textbooks).
- **Tech**: Bounding-box sort via lightweight vision model or PyPDF layout stream coordinates.
- **Benefit**: Eliminates sentence interleaving across columns.

### Phase 4: Multilingual Sentence Segmentation
- **Objective**: Support non-Latin sentence boundaries (CJK characters, Arabic, Cyrillic).
- **Tech**: Language detection via `fasttext-wheel` or `langdetect` + specialized rule tokenizers (`jieba`, `spacy-pkuseg`).

### Phase 5: In-Memory SHA-256 OCR Cache
- **Objective**: Deduplicate OCR inference across repeated scans or reloaded pages.
- **Tech**: In-memory LRU cache (`cachetools` / `OrderedDict`) keyed by image content SHA-256 hash.
- **Benefit**: Zero-latency re-parsing of previously processed pages.

### Phase 6: Containerization & Cloud-Native Packaging
- **Objective**: Single-command container deployment.
- **Tech**: Multi-stage `Dockerfile` with distroless/slim Python base and Docker Compose configuration.

---

## 4. Verification & Testing Standards

- **Unit & Service Tests**: `pytest -v backend/tests/` covering routing, parsing, segmentation, and mock OCR.
- **Type Compliance**: Strict Pydantic v2 validation without runtime schema warnings.
- **Security Baseline**: No API keys hardcoded in source; all secrets ingested via environment variables.
