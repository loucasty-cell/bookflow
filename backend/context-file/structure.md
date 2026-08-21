# Bookflow Backend Structure

Modular service-oriented architecture for the Bookflow FastAPI Python backend.

---

## 1. Directory Tree

```text
backend/
|-- app/
|   |-- core/
|   |   |-- __init__.py
|   |   `-- config.py            # Pydantic BaseSettings, env vars, Paddle/HF OCR presets, limits
|   |-- models/
|   |   |-- __init__.py
|   |   |-- document.py          # NormalizedBook, Chapter, Paragraph, Section schemas
|   |   |-- ocr.py               # OCRPageResult, OCRDocumentResponse, HFModelInfo schemas
|   |   `-- reader.py            # Notes, bookmarks, reading time, segmentation schemas
|   |-- routers/
|   |   |-- __init__.py
|   |   |-- health.py            # GET /api/health, GET /api/info
|   |   |-- ocr.py               # POST /api/ocr/image, /batch, /pdf, GET /api/ocr/models
|   |   |-- documents.py         # POST /api/documents/parse, POST /api/documents/validate
|   |   `-- reader.py            # POST /api/reader/segment, /reading-time, notes export/import
|   |-- services/
|   |   |-- __init__.py
|   |   |-- huggingface_ocr.py   # Hugging Face OpenAI-compatible Qwen vision client
|   |   |-- paddle_ocr.py        # PaddleOCR-compatible HTTP adapter
|   |   |-- ocr_service.py       # Multi-page PDF & concurrent batch OCR orchestrator
|   |   |-- document_service.py  # PDF (PyMuPDF + pypdf), EPUB, TXT, MD document parser
|   |   `-- text_service.py      # Sentence segmentation, abbreviations, reading time
|   |-- __init__.py
|   `-- main.py                  # FastAPI app factory, CORS, exception handlers, router registry
|-- context-file/                # Backend engineering context & technical specs
|   |-- api.md                   # Backend REST API endpoint reference
|   |-- backendskills.md         # Engineering skills, patterns, and roadmap updates
|   |-- overview.md              # System overview & technology stack
|   `-- structure.md             # Architecture layout & dependency rules
|-- tests/
|   |-- __init__.py
|   |-- conftest.py              # Pytest fixtures and mock client
|   |-- test_health.py           # Health endpoint tests
|   |-- test_text.py             # Segmentation & metrics tests
|   |-- test_documents.py        # Document parsing tests
|   |-- test_ocr.py              # OCR service & mock HF inference tests
|   `-- test_reader.py           # Reader utilities tests
|-- .env.example                 # Configuration template
|-- .venv/                       # Python 3.12 virtual environment (gitignored)
|-- main.py                      # Optional PaddleOCR-first engine with HF fallback + SSE
|-- requirements.txt             # Python dependency manifest
|-- run.py                       # CLI application launcher
`-- README.md                    # Backend setup and documentation
```

---

## 2. Dual Entry Points

### `backend/main.py` (Optional Remote OCR Engine)
The standalone FastAPI application for explicitly requested remote visual scanning:
- Renders PDF pages to 96 DPI JPEG in-memory via PyMuPDF with thread pool executor.
- Uses the explicitly configured PaddleOCR endpoint first, then verifies Hugging Face provider support for fallback requests.
- Streams real-time progress to the frontend via Server-Sent Events (SSE) with heartbeat keepalives.
- Manages background OCR jobs with in-memory thread-safe storage and subscriber queues.
- Mounts the legacy `app/routers/` when available via conditional import.

### `backend/app/main.py` (Legacy App Factory)
The original modular FastAPI application with router-based architecture:
- Registers `app/routers/` for health, OCR, documents, and reader endpoints.
- Configures CORS middleware and exception handlers.

---

## 3. Layer Responsibilities

### Core (`app/core/`)
- Encapsulates environment variable parsing via Pydantic `BaseSettings`.
- Defines configuration constants (max file sizes, batch limits, and the selected remote OCR model).

### Models (`app/models/`)
- Declares type-safe data contracts using Pydantic v2 `BaseModel` with `ConfigDict(populate_by_name=True)`.
- Uses `serialization_alias` + `validation_alias` on all aliased fields so Python code uses snake_case constructors while JSON responses serialize to camelCase for the frontend API.
- Validates request payloads and guarantees schema compliance for client responses.

### Routers (`app/routers/`)
- Thin HTTP controllers responsible for request validation, header/token extraction, and delegating execution to services.
- Never contains business logic or direct I/O manipulation.

### Services (`app/services/`)
- **`HuggingFaceOCRService`**: Manages HTTP sessions, image optimization, token authentication, OpenAI-compatible chat payloads, and model response parsing.
- **`PaddleOCRClient`**: Sends the official base64 `file`/`fileType` request to a PaddleX `/ocr` service and parses nested OCR results.
- **`OCRService`**: Orchestrates document-level and batch image OCR tasks with concurrent page processing and Paddle/HF fallback.
- **`DocumentService`**: Encapsulates multi-format document extraction (PDF via PyMuPDF + pypdf fallback, EPUB, TXT, Markdown).
- **`TextService`**: Stateless algorithms for sentence boundary extraction and reading duration metrics.

---

## 4. Development Environment

| Tool | Configuration | Purpose |
| --- | --- | --- |
| Virtual Environment | `backend/.venv/` (Python 3.12) | Isolated dependency installation |
| Pyright | `pyrightconfig.json` (workspace root) | Static type checking targeting `.venv` |
| VS Code | `.vscode/settings.json` | Interpreter path set to `.venv/Scripts/python.exe` |
| ESLint | `eslint.config.js` | Ignores `.venv/**` and `__pycache__/**` to prevent false positives |

---

## 5. Extension Rules

| Extension | Target File | Pattern |
| --- | --- | --- |
| Change remote OCR model or endpoint | `.env` | Update `OCR_MODEL` or `HF_INFERENCE_URL` after checking provider support |
| Add document format parser | `app/services/document_service.py` | Implement parser method + update `validate_file` |
| Add endpoint router | `app/routers/` + `app/main.py` | Create router module and register in `app.include_router` |
| Add data model | `app/models/` | Add Pydantic schema with `populate_by_name=True` and `serialization_alias` + `validation_alias` |
