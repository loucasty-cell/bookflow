# Bookflow Backend Structure

Modular service-oriented architecture for the Bookflow FastAPI Python backend.

---

## 1. Directory Tree

```text
backend/
|-- app/
|   |-- core/
|   |   |-- __init__.py
|   |   `-- config.py            # Pydantic BaseSettings, env vars, HF OCR presets, limits
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
|   |   |-- huggingface_ocr.py   # Hugging Face Vision OCR client (Inference API + retry logic)
|   |   |-- ocr_service.py       # Multi-page PDF & concurrent batch OCR orchestrator
|   |   |-- document_service.py  # PDF, EPUB, TXT, MD document parser
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
|-- requirements.txt             # Python dependency manifest
|-- run.py                       # CLI application launcher
`-- README.md                    # Backend setup and documentation
```

---

## 2. Layer Responsibilities

### Core (`app/core/`)
- Encapsulates environment variable parsing via Pydantic `BaseSettings`.
- Defines immutable configuration constants (max file sizes, batch limits, curated model definitions).

### Models (`app/models/`)
- Declares type-safe data contracts using Pydantic v2 `BaseModel` with `ConfigDict(populate_by_name=True)`.
- Validates request payloads and guarantees schema compliance for client responses.

### Routers (`app/routers/`)
- Thin HTTP controllers responsible for request validation, header/token extraction, and delegating execution to services.
- Never contains business logic or direct I/O manipulation.

### Services (`app/services/`)
- **`HuggingFaceOCRService`**: Manages HTTP sessions, image optimization, token authentication, and model response parsing.
- **`OCRService`**: Orchestrates document-level and batch image OCR tasks.
- **`DocumentService`**: Encapsulates multi-format document extraction.
- **`TextService`**: Stateless algorithms for sentence boundary extraction and reading duration metrics.

---

## 3. Extension Rules

| Extension | Target File | Pattern |
| --- | --- | --- |
| Add new OCR vision model | `app/core/config.py` | Add entry to `available_hf_ocr_models` |
| Add document format parser | `app/services/document_service.py` | Implement parser method + update `validate_file` |
| Add endpoint router | `app/routers/` + `app/main.py` | Create router module and register in `app.include_router` |
| Add data model | `app/models/` | Add Pydantic schema with `populate_by_name=True` |
