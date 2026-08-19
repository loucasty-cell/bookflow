# Bookflow Backend Overview

High-performance Python backend powering document ingestion, structural parsing, sentence analytics, and accelerated Hugging Face Vision OCR scanning for Bookflow.

---

## 1. System Purpose & Core Pillars

- **Zero Content Persistence**: Book contents are processed on-demand in-memory without persistent server storage to respect user privacy.
- **High-Throughput Vision OCR**: Offloads heavy scanned document text extraction to Hugging Face Vision models (`microsoft/trocr-base-stage1`, `stepfun-ai/GOT-OCR2_0`, `facebook/nougat-base`).
- **Normalized Data Contracts**: Produces identical `NormalizedBook` structures matching frontend reader expectations.
- **Asynchronous & Non-Blocking**: Built on `asyncio` and `httpx.AsyncClient` with bounded concurrency semaphores.

---

## 2. Technology Stack

| Component | Technology | Role |
| --- | --- | --- |
| Framework | FastAPI 0.115+ | High-speed async REST API |
| Validation | Pydantic v2 / Pydantic-Settings | Strict request/response typing & environment config |
| Network Client | HTTPX 0.27+ | Async HTTP client for Hugging Face Inference API |
| Image Pipeline | Pillow (PIL) 10.4+ | EXIF correction, RGB conversion, aspect-ratio downscaling |
| Document Parsing | PyPDF 4.3+ & BeautifulSoup4 | Native PDF extraction & EPUB spine/container parsing |
| Test Suite | Pytest 8.3+ & Pytest-Asyncio | Automated endpoint & service integration tests |
| Runtime / Server | Uvicorn 0.30+ | ASGI server implementation |

---

## 3. Architecture & Data Flow

```text
[Client / Frontend]
       |
       | (Multipart Document / Image Upload)
       v
[FastAPI Routers: /api/ocr, /api/documents, /api/reader]
       |
       v
[Service Layer]
  |-- HuggingFaceOCRService: Preprocesses images -> Calls HF Inference API -> Parses text
  |-- OCRService: PDF stream extraction -> Splits pages -> Concurrent batch OCR
  |-- DocumentService: Multi-format parsing (PDF, EPUB, TXT, MD) -> NormalizedBook
  `-- TextService: Sentence boundary segmentation & reading metrics
       |
       v
[Normalized JSON Output: Bookflow Contract]
```

---

## 4. Privacy & Operational Boundaries

- **Ephemeral Memory**: Uploaded files and extracted texts exist only for the request lifecycle.
- **No Unsolicited Network Calls**: Third-party outbound calls occur only when user explicitly invokes Hugging Face OCR endpoints.
- **Stateless Operation**: Scaling requires no shared session state or database clustering.
