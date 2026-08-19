# Bookflow

Bookflow is a private, paragraph-focused reading space for PDFs, EPUB ebooks, text files, and Markdown with a React frontend and a high-performance FastAPI Python backend for document processing and fast Hugging Face Vision OCR scanning.

![Bookflow reader](https://img.shields.io/badge/reader-local--first-507B9C) ![React](https://img.shields.io/badge/React-18-61dafb) ![Vite](https://img.shields.io/badge/Vite-6-646cff) ![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688)

---

## Documentation & Context Files

- **[features.md](file:///C:/Users/ASUS/OneDrive/Documents/GitHub/bookflow/features.md)**: Detailed feature breakdown across the frontend reader, backend processing, and Hugging Face Vision OCR models.
- **[structure.md](file:///C:/Users/ASUS/OneDrive/Documents/GitHub/bookflow/structure.md)**: Complete repository structure, directory tree, layer responsibilities, and architecture guidelines.
- **[api.md](file:///C:/Users/ASUS/OneDrive/Documents/GitHub/bookflow/api.md)**: Full API reference detailing Frontend data contracts, browser storage schemas, and FastAPI REST API endpoints.
- **[debugging.md](file:///C:/Users/ASUS/OneDrive/Documents/GitHub/bookflow/debugging.md)**: Diagnostics, common error resolutions, and step-by-step troubleshooting workflows.

---

## Core Capabilities

- **Sentence & Paragraph Reading Focus**: A gentle highlight settles on the active sentence or paragraph near the 42% reading rail during scrolling.
- **Pinned Focus & Fluid Scroll**: Pin any paragraph with `Space`, `Enter`, or a click to hold focus while scrolling nearby context.
- **Multi-Format Document Processing**: Supports `.pdf`, `.epub`, `.txt`, `.md`, and `.markdown` files up to 50 MB.
- **Fast Hugging Face Vision OCR**: Accelerated image-to-text scanning powered by Hugging Face models (`microsoft/trocr-base-stage1`, `microsoft/trocr-large-printed`, `stepfun-ai/GOT-OCR2_0`, `facebook/nougat-base`).
- **Private & Local-First**: Reading content stays on the user's device by default. Backend processing is opt-in for accelerated scanning without persistent document storage.
- **Margin Notes & Bookmarks**: Save quotes, notes, and bookmarks in browser storage with import/export capabilities.
- **Dual Atmosphere Themes**: Paper Mode (warm physical book style) and Dusk Mode (near-black night palette).

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, Vite 6, PDF.js, JSZip, Tesseract.js (WASM), Lucide Icons |
| Backend | Python 3.10+, FastAPI, Uvicorn, Pydantic, HTTPX, Pillow, PyPDF |
| Vision / OCR | Hugging Face Inference API & Models (TrOCR, Nougat, GOT-OCR 2.0) |
| Testing & Quality | Vitest, ESLint, Pytest |

---

## Quickstart

### 1. Frontend (React / Vite)

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Run checks:

```bash
npm run lint
npm run test
npm run build
```

### 2. Backend (FastAPI Python)

Requires Python 3.10 or newer.

```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Set HF_API_KEY in .env if using Hugging Face Vision OCR
python run.py
```

Backend interactive API documentation:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

Run backend tests:

```bash
pytest backend/tests
```
