# Bookflow Project Structure

This document defines the complete repository layout, architectural boundaries, and conventions across the React frontend and FastAPI backend.

## 1. Overall Project Layout

```text
bookflow/
|-- backend/                       # FastAPI Python backend service
|   |-- app/
|   |   |-- core/
|   |   |   |-- __init__.py
|   |   |   `-- config.py          # App settings, environment vars, HF OCR configuration
|   |   |-- models/
|   |   |   |-- __init__.py
|   |   |   |-- document.py        # NormalizedBook, Chapter, Paragraph schemas
|   |   |   |-- ocr.py             # OCR request/response and model info schemas
|   |   |   `-- reader.py          # Notes, bookmarks, reading time, segmentation schemas
|   |   |-- routers/
|   |   |   |-- __init__.py
|   |   |   |-- health.py          # /api/health, /api/info
|   |   |   |-- ocr.py             # /api/ocr/image, /api/ocr/batch, /api/ocr/pdf, /api/ocr/models
|   |   |   |-- documents.py       # /api/documents/parse, /api/documents/validate
|   |   |   `-- reader.py          # /api/reader/segment, /api/reader/reading-time, notes export/import
|   |   |-- services/
|   |   |   |-- __init__.py
|   |   |   |-- huggingface_ocr.py # Hugging Face OpenAI-compatible Qwen vision client
|   |   |   |-- paddle_ocr.py # PaddleOCR-compatible HTTP adapter
|   |   |   |-- ocr_service.py     # PDF extraction & batch OCR orchestrator
|   |   |   |-- document_service.py# Multi-format document parser (PDF, EPUB, TXT, MD)
|   |   |   `-- text_service.py    # Sentence segmentation, abbreviations, reading time
|   |   |-- __init__.py
|   |   `-- main.py                # FastAPI app instance, CORS middleware, routing
|   |-- context-file/              # Backend engineering context & technical specs
|   |   |-- api.md                 # Backend REST API endpoint reference
|   |   |-- backendskills.md       # Engineering skills, patterns, and roadmap updates
|   |   |-- overview.md            # System overview & technology stack
|   |   `-- structure.md           # Architecture layout & dependency rules
|   |-- tests/
|   |   |-- __init__.py
|   |   |-- conftest.py            # Pytest test client and sample image fixtures
|   |   |-- test_health.py         # System health endpoint tests
|   |   |-- test_text.py           # Segmentation and metrics tests
|   |   |-- test_documents.py      # Document parser tests
|   |   |-- test_ocr.py            # OCR service & mock HF inference tests
|   |   `-- test_reader.py         # Reader utility tests
|   |-- .env.example               # Backend configuration template
|   |-- .venv/                     # Python 3.12 virtual environment (gitignored)
|   |-- main.py                    # Optional configured Hugging Face OCR engine + SSE
|   |-- requirements.txt           # Python dependency manifest
|   |-- run.py                     # Entrypoint launcher script
|   `-- README.md                  # Backend guide
|-- app/                            # Next.js App Router entry
|   |-- layout.jsx                  # Root HTML layout and metadata
|   `-- page.jsx                    # Client-side App shell
|-- src/                           # Frontend React application
|   |-- assets/                    # Static brand assets (quill logo, intro video)
|   |-- components/
|   |   |-- InterventionModal.jsx
|   |   |-- OcrUploader.jsx        # Frontend OCR upload modal with SSE progress streaming
|   |   `-- VariableRewardCapsule.jsx
|   |-- features/
|   |   |-- document-import/       # Client-side document parsers and OCR fallback
|   |   |   |-- lib/
|   |   |   |   |-- documentParsers.js
|   |   |   |   |-- epubParser.js
|   |   |   |   |-- epubUtils.js
|   |   |   |   |-- fileValidation.js
|   |   |   |   |-- pdfOcr.js
|   |   |   |   |-- pdfParser.js
|   |   |   |   `-- textParser.js
|   |   |   `-- index.js           # Public API for document import
|   |   |-- landing/               # Welcome screen and sample book experience
|   |   |   |-- components/
|   |   |   |   |-- BookOpeningIntro.jsx
|   |   |   |   `-- LandingPage.jsx
|   |   |   |-- sampleBook.js
|   |   |   `-- index.js           # Public API for landing feature
|   |   `-- reader/                # Core sentence-focus reading experience
|   |       |-- components/
|   |       |   |-- ContentsPanel.jsx
|   |       |   |-- FocusCard.jsx
|   |       |   |-- NotesPanel.jsx
|   |       |   |-- ReaderPage.jsx
|   |       |   `-- SettingsPanel.jsx
|   |       |-- lib/
|   |       |   |-- focusEligibility.js
|   |       |   |-- focusRail.js
|   |       |   |-- readerViewport.js
|   |       |   |-- readingController.js
|   |       |   `-- readingTime.js
|   |       |-- config.js
|   |       `-- index.js           # Public API for reader feature
|   |-- shared/                    # Reusable UI components and utilities
|   |   |-- components/
|   |   |   |-- Brand.jsx
|   |   |   |-- LoadingOverlay.jsx
|   |   |   `-- index.js
|   |   `-- lib/
|   |       |-- storage.js         # Browser localStorage wrappers
|   |       |-- text.js            # Frontend text metrics and segmentation
|   |       `-- index.js
|   |-- store/
|   |   |-- readerStore.js          # Zustand reader state (settings, progress, bookmarks, notes)
|   |   `-- uiStore.js             # Zustand UI state (panels, modals, loading)
|   |-- App.jsx                    # Root state composition & reading lifecycle
|   `-- styles.css                 # Responsive typography, atmosphere themes, layout
|-- AGENTS.md                      # Agent rules and repository conventions
|-- README.md                      # Project overview and quickstart
|-- api.md                         # API reference (frontend data contracts & backend REST API)
|-- structure.md                   # Repository layout and architecture guide
|-- debugging.md                   # Diagnostics, troubleshooting, and debug workflows
|-- features.md                    # Detailed feature reference & capabilities
|-- detailsinfo.md                 # Technical background details
|-- goals.md                       # Product roadmap and goal verification
|-- pyrightconfig.json             # Pyright type checking config targeting backend/.venv
|-- eslint.config.js               # Frontend linting rules (ignores .venv, __pycache__)
|-- package.json                   # Frontend dependencies and Next.js scripts
`-- next.config.mjs                # Next.js build configuration
```

---

## 2. Layer Responsibilities

### Frontend Layer (`src/`)

- **`App.jsx`**: Coordinates application mode (landing vs reader), document loading, reading position restoration, focus rail synchronization, local storage persistence, and OCR modal integration.
- **`components/OcrUploader.jsx`**: Standalone OCR upload modal with drag-and-drop file selection, real-time SSE progress dashboard, paginated text viewer with formatted/raw toggle, full-text search, clipboard copy, Markdown download, and reader import with automatic chapter title extraction.
- **`features/document-import/`**: Validates file types and sizes; extracts text locally from PDF, EPUB, TXT, and Markdown; orchestrates local Tesseract OCR when offline.
- **`features/reader/`**: Renders comfortable typography; tracks scroll position to calculate sentence focus near the 42% reading rail; manages pinned focus, margin notes, bookmarks, and reader customization.
- **`features/landing/`**: Provides book dropzone, file selection, and offline sample book experience.
- **`shared/`**: Houses cross-cutting brand elements, overlays, and storage utilities.

### Backend Layer (`backend/`)

- **`main.py` (root)**: Optional remote OCR engine using PaddleOCR first and the model configured in `OCR_MODEL` as fallback. Handles PDF page rendering via PyMuPDF thread pool, concurrent batch inference, SSE progress streaming, and background job management.
- **`app/core/`**: Configuration management via Pydantic `BaseSettings`, environment variables, CORS configuration, and the selected OCR model.
- **`app/models/`**: Pydantic v2 schemas with `serialization_alias` + `validation_alias` for snake_case Python / camelCase JSON interop. Validates Normalized Books, OCR requests/responses, and reader export bundles.
- **`app/services/`**:
  - `huggingface_ocr.py`: Connects to Hugging Face Vision/OCR models via Inference API, applies image preprocessing, handles retry logic, and parses model outputs.
  - `ocr_service.py`: Orchestrates multi-page PDF processing and concurrent batch image scanning.
  - `document_service.py`: Server-side parsing of PDF (PyMuPDF + pypdf fallback), EPUB, TXT, and Markdown files.
  - `text_service.py`: High-precision sentence segmentation, word counting, and reading time calculation.
- **`app/routers/`**: RESTful endpoints exposing OCR, document parsing, reader utilities, and health checks.

---

## 3. Communication Patterns

1. **Local-First Processing (Default)**:
   Document parsing runs entirely inside the browser using JavaScript libraries (PDF.js, JSZip) to guarantee private, zero-network reading.

2. **High-Throughput Visual Scanning (Opt-in)**:
   Frontend uploads a PDF to `POST /api/ocr/scan`, then subscribes to `GET /api/ocr/progress/{job_id}` via SSE. The backend renders pages at 96 DPI, dispatches concurrent batches to PaddleOCR first and the configured Hugging Face model as fallback, and streams per-page results in real time.

3. **Legacy Server-Accelerated OCR (Opt-in)**:
   When accelerated OCR is requested, the frontend sends PDF slices to `POST /api/ocr/scan`; the backend uses PaddleOCR first and the Hugging Face Qwen vision route as fallback.

4. **Data Normalization Consistency**:
   Both client and server parsers emit the identical `NormalizedBook` schema, ensuring reader components operate transparently regardless of source.

---

## 4. Placement Rules for Future Changes

| Change | Target Location |
| --- | --- |
| New client-side file parser | `src/features/document-import/lib/` |
| New server-side file parser | `backend/app/services/document_service.py` |
| Change remote OCR model or endpoint | `.env` (`OCR_MODEL`, `HF_INFERENCE_URL`) |
| New Hugging Face Vision/OCR model integration | `backend/app/services/huggingface_ocr.py` |
| New backend API route | `backend/app/routers/` |
| Reader visual theme or CSS variable | `src/styles.css` |
| Reader-specific React component | `src/features/reader/components/` |
| Reusable UI widget used in 2+ features | `src/shared/components/` |
| Frontend unit tests | Beside tested file (`*.test.js`) |
| Backend unit tests | `backend/tests/test_*.py` |

---

## 5. Architectural Quality Standards

1. Keep frontend dependencies minimal and avoid external CSS frameworks.
2. Render book text strictly through React text nodes (never `dangerouslySetInnerHTML`).
3. Keep heavy parsing libraries lazy-loaded.
4. Support clean graceful degradation when backend services or vLLM/Hugging Face APIs are unreachable.
5. Use Pydantic v2 `serialization_alias` + `validation_alias` for all aliased model fields.
6. Maintain Pyright zero errors via `pyrightconfig.json` targeting `backend/.venv`.
7. Verify changes with `npm run lint`, `npm run test`, `npm run build`, and `pytest backend/tests`.
