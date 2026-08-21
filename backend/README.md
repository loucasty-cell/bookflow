# Bookflow FastAPI Backend

Python backend for Bookflow providing document parsing, text segmentation, reading metrics, and optional OCR integration.

## Features

- **OCR routing**: Uses a self-hosted PaddleOCR-compatible service first when `PADDLEOCR_URL` is configured, then can fall back to the Hugging Face OpenAI-compatible vision route.
- **Document Processing**: Parses PDF, EPUB, Markdown, and TXT documents into normalized Bookflow book structures.
- **Text & Reading Metrics**: Abbreviation-aware sentence segmentation, paragraph normalization, and reading time estimation.
- **Notes & Bookmarks Exchange**: Validated import and export pipelines for reader notes and reading states.

## Getting Started

### 1. Requirements

- Python 3.10+
- Virtual environment (recommended)

### 2. Installation

```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Or install as an editable package with development dependencies:
pip install -e ".[dev]"

# Build distribution wheels and tarballs:
python -m build
```

### 3. Environment Configuration

Copy the sample environment file:

```bash
cp .env.example .env
```

To enable the optional OCR providers, copy `.env.example` to `.env`. PaddleOCR is the preferred backend path:

```ini
PADDLEOCR_URL=http://127.0.0.1:8080/ocr
PADDLEOCR_TIMEOUT=60.0
HF_TOKEN=your_huggingface_token_here
OCR_MODEL=Qwen/Qwen2-VL-7B-Instruct
HF_INFERENCE_URL=https://router.huggingface.co/v1/chat/completions
```

Start PaddleX's OCR serving process with `paddlex --serve --pipeline OCR` and point `PADDLEOCR_URL` at its `/ocr` endpoint. The adapter sends the official JSON shape (`file` as base64 and `fileType: 1`).

The Hugging Face fallback uses the official OpenAI-compatible route and a `messages` payload containing a text prompt plus a base64 image data URL. The configured model must be available through an enabled Inference Provider; the backend preflights the model and returns an actionable error when it is not. Qwen2-VL is kept as the requested default, but availability is provider/account dependent. Leave both OCR provider settings blank when you only want the private browser-based OCR path; standard imports do not need this backend.

### 4. Running the Development Server

```bash
python run.py
```

Or using uvicorn directly:

```bash
uvicorn app.main:app --reload --port 8000
```

The interactive API documentation is available at:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 5. Running Automated Tests

```bash
pytest
```

## API Endpoints Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/info` | Backend configuration and model capabilities |
| `GET` | `/api/ocr/models` | Show the configured Hugging Face OCR model |
| `POST` | `/api/ocr/image` | Scan a single image through PaddleOCR, then Hugging Face fallback |
| `POST` | `/api/ocr/batch` | Scan multiple images concurrently |
| `POST` | `/api/ocr/pdf` | Scan a PDF document with native text, PaddleOCR, and HF fallback |
| `POST` | `/api/documents/parse` | Parse a PDF, EPUB, TXT, or MD into normalized book JSON |
| `POST` | `/api/documents/validate` | Validate document type and file size |
| `POST` | `/api/reader/segment` | Segment text into sentences and paragraphs |
| `POST` | `/api/reader/reading-time` | Calculate reading time estimate |
| `POST` | `/api/reader/notes/export` | Validate and format notes export bundle |
| `POST` | `/api/reader/notes/import` | Validate imported notes bundle |

## Directory Structure

```text
backend/
|-- app/
|   |-- core/
|   |   |-- __init__.py
|   |   `-- config.py            # App settings, environment vars, HF token & models
|   |-- models/
|   |   |-- __init__.py
|   |   |-- document.py          # NormalizedBook, Chapter, Paragraph, Section schemas
|   |   |-- ocr.py               # OCR request/response and HF model schemas
|   |   `-- reader.py            # Notes, bookmarks, reading time, and segmentation schemas
|   |-- routers/
|   |   |-- __init__.py
|   |   |-- health.py            # /api/health and /api/info
|   |   |-- ocr.py               # /api/ocr/image, /api/ocr/batch, /api/ocr/pdf, /api/ocr/models
|   |   |-- documents.py         # /api/documents/parse, /api/documents/validate
|   |   `-- reader.py            # /api/reader/segment, /api/reader/reading-time, notes export/import
|   |-- services/
|   |   |-- __init__.py
|   |   |-- huggingface_ocr.py   # Hugging Face OpenAI-compatible Qwen vision client
|   |   |-- paddle_ocr.py        # PaddleOCR-compatible HTTP adapter
|   |   |-- ocr_service.py       # Multi-page PDF and batch image OCR orchestration
|   |   |-- document_service.py  # PDF, EPUB, TXT, MD document parser
|   |   `-- text_service.py      # Sentence segmentation, abbreviations, reading time
|   |-- __init__.py
|   `-- main.py                  # FastAPI app, CORS, error handling, router inclusion
|-- tests/
|   |-- __init__.py
|   |-- conftest.py              # Pytest fixtures and mock client
|   |-- test_health.py           # Health check tests
|   |-- test_text.py             # Sentence and metrics tests
|   |-- test_documents.py        # Document parsing tests
|   |-- test_ocr.py              # OCR service and mock HF inference tests
|   `-- test_reader.py           # Reader utility tests
|-- .env.example                 # Configuration template
|-- requirements.txt             # Python dependencies
|-- run.py                       # Startup script
`-- README.md                    # Backend documentation
```
