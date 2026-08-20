# Bookflow FastAPI Backend

High-performance Python backend for Bookflow providing document parsing, text segmentation, reading metrics, and fast Image-to-Text OCR scanning powered by Hugging Face Vision models.

## Features

- **Hugging Face Vision OCR**: Fast image-to-text text extraction using models such as `microsoft/trocr-base-stage1`, `microsoft/trocr-large-printed`, `stepfun-ai/GOT-OCR2_0`, and `facebook/nougat-base`.
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

Set your Hugging Face API key in `.env`:

```ini
HF_API_KEY=your_huggingface_token_here
HF_OCR_MODEL=microsoft/trocr-base-stage1
```

Get a free Hugging Face API token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

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
| `GET` | `/api/ocr/models` | List recommended Hugging Face OCR models |
| `POST` | `/api/ocr/image` | Scan a single image via Hugging Face OCR |
| `POST` | `/api/ocr/batch` | Scan multiple images concurrently |
| `POST` | `/api/ocr/pdf` | Scan a PDF document with native + HF OCR |
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
|   |   |-- huggingface_ocr.py   # Dedicated Hugging Face Vision OCR client
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
