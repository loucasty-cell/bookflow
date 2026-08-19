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
|   |   |   |-- huggingface_ocr.py # Hugging Face Vision OCR client (Inference API + retry logic)
|   |   |   |-- ocr_service.py     # PDF extraction & batch OCR orchestrator
|   |   |   |-- document_service.py# Multi-format document parser (PDF, EPUB, TXT, MD)
|   |   |   `-- text_service.py    # Sentence segmentation, abbreviations, reading time
|   |   |-- __init__.py
|   |   `-- main.py                # FastAPI app instance, CORS middleware, routing
|   |-- tests/
|   |   |-- __init__.py
|   |   |-- conftest.py            # Pytest test client and sample image fixtures
|   |   |-- test_health.py         # System health endpoint tests
|   |   |-- test_text.py           # Segmentation and metrics tests
|   |   |-- test_documents.py      # Document parser tests
|   |   |-- test_ocr.py            # OCR service & mock HF inference tests
|   |   `-- test_reader.py         # Reader utility tests
|   |-- .env.example               # Backend configuration template
|   |-- requirements.txt           # Python backend dependencies
|   |-- run.py                     # Entrypoint launcher script
|   `-- README.md                  # Backend guide
|-- src/                           # Frontend React application
|   |-- assets/                    # Static brand assets (quill logo, intro video)
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
|   |-- App.jsx                    # Root state composition & reading lifecycle
|   |-- main.jsx                   # React root mount
|   `-- styles.css                 # Responsive typography, atmosphere themes, layout
|-- AGENTS.md                      # Agent rules and repository conventions
|-- README.md                      # Project overview and quickstart
|-- api.md                         # API reference (frontend data contracts & backend REST API)
|-- structure.md                   # Repository layout and architecture guide
|-- debugging.md                   # Diagnostics, troubleshooting, and debug workflows
|-- features.md                    # Detailed feature reference & capabilities
|-- detailsinfo.md                 # Technical background details
|-- goals.md                       # Product roadmap and goal verification
|-- eslint.config.js               # Frontend linting rules
|-- index.html                     # HTML template
|-- package.json                   # Frontend dependencies and scripts
`-- vite.config.js                 # Vite build configuration
```

---

## 2. Layer Responsibilities

### Frontend Layer (`src/`)

- **`App.jsx`**: Coordinates application mode (landing vs reader), document loading, reading position restoration, focus rail synchronization, and local storage persistence.
- **`features/document-import/`**: Validates file types and sizes; extracts text locally from PDF, EPUB, TXT, and Markdown; orchestrates local Tesseract OCR when offline.
- **`features/reader/`**: Renders comfortable typography; tracks scroll position to calculate sentence focus near the 42% reading rail; manages pinned focus, margin notes, bookmarks, and reader customization.
- **`features/landing/`**: Provides book dropzone, file selection, and offline sample book experience.
- **`shared/`**: Houses cross-cutting brand elements, overlays, and storage utilities.

### Backend Layer (`backend/`)

- **`app/core/`**: Configuration management via Pydantic `BaseSettings`, environment variables, CORS configuration, and OCR model presets.
- **`app/models/`**: Pydantic schemas validating Normalized Books, OCR requests/responses, and reader export bundles.
- **`app/services/`**:
  - `huggingface_ocr.py`: Connects to Hugging Face Vision/OCR models via Inference API, applies image preprocessing, handles retry logic, and parses model outputs.
  - `ocr_service.py`: Orchestrates multi-page PDF processing and concurrent batch image scanning.
  - `document_service.py`: Server-side parsing of PDF, EPUB, TXT, and Markdown files.
  - `text_service.py`: High-precision sentence segmentation, word counting, and reading time calculation.
- **`app/routers/`**: RESTful endpoints exposing OCR, document parsing, reader utilities, and health checks.

---

## 3. Communication Patterns

1. **Local-First Processing (Default)**:
   Document parsing runs entirely inside the browser using JavaScript libraries (PDF.js, JSZip) to guarantee private, zero-network reading.

2. **Server-Accelerated OCR (Optional/Opt-in)**:
   When high-speed or dense-text OCR is requested, frontend sends image bytes or PDF slices to `POST /api/ocr/image` or `POST /api/ocr/pdf`, which leverages Hugging Face Vision models (`microsoft/trocr-base-stage1`, `stepfun-ai/GOT-OCR2_0`, etc.).

3. **Data Normalization Consistency**:
   Both client and server parsers emit the identical `NormalizedBook` schema, ensuring reader components operate transparently regardless of source.

---

## 4. Placement Rules for Future Changes

| Change | Target Location |
| --- | --- |
| New client-side file parser | `src/features/document-import/lib/` |
| New server-side file parser | `backend/app/services/document_service.py` |
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
4. Support clean graceful degradation when backend services or Hugging Face APIs are unreachable.
5. Verify changes with `npm run lint`, `npm run test`, `npm run build`, and `pytest backend/tests`.
