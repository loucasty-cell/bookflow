# Bookflow Backend Overview

Python backend powering document ingestion, structural parsing, sentence analytics, and optional OCR scanning for Bookflow.

---

## 1. System Purpose & Core Pillars

- **Zero Content Persistence**: Book contents are processed on-demand in-memory without persistent server storage to respect user privacy.
- **Optional OCR routing**: Sends explicitly submitted scanned page images to self-hosted PaddleOCR first, then verifies Hugging Face provider support for fallback.
- **Normalized Data Contracts**: Produces identical `NormalizedBook` structures matching frontend reader expectations.
- **Asynchronous & Non-Blocking**: Built on `asyncio` and `httpx.AsyncClient` with bounded concurrency semaphores.

---

## 2. Technology Stack

| Component | Technology | Role |
| --- | --- | --- |
| Framework | FastAPI 0.115+ | High-speed async REST API |
| Validation | Pydantic v2 / Pydantic-Settings | Strict request/response typing & environment config |
| Network Client | HTTPX 0.27+ | Async HTTP client for PaddleOCR and Hugging Face APIs |
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
  |-- PaddleOCRClient: Sends base64 page payloads -> Parses PaddleX OCR results
  |-- HuggingFaceOCRService: Preprocesses images -> Calls HF chat completions -> Parses text
  |-- OCRService: PDF stream extraction -> Splits pages -> Concurrent Paddle/HF OCR
  |-- DocumentService: Multi-format parsing (PDF, EPUB, TXT, MD) -> NormalizedBook
  `-- TextService: Sentence boundary segmentation & reading metrics
       |
       v
[Normalized JSON Output: Bookflow Contract]
```

---

## 4. Privacy & Operational Boundaries

- **Ephemeral Memory**: Uploaded files and extracted texts exist only for the request lifecycle.
- **No Unsolicited Network Calls**: Outbound calls occur only when the user explicitly invokes accelerated OCR; PaddleOCR can remain on the local network and Hugging Face is only the configured fallback.
- **Stateless Operation**: Scaling requires no shared session state or database clustering.
