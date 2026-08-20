# Bookflow

Bookflow is a private, calm, and focus-driven document reading application that turns PDFs, EPUB ebooks, Markdown, and text files into a sentence-focused reading experience.

Designed with cognitive ergonomics and behavioral product design, Bookflow helps readers sustain deep-work focus and overcome digital distraction.

---

## Key Features

### 1. Golden-Ratio Sentence Focus Rail
- **Scroll-Driven Focus**: As you scroll, a gentle highlight settles on the active sentence near the golden-ratio reading line (`0.382`), reducing saccadic regressions and visual fatigue.
- **Pin & Reflect**: Press `Escape`, `Space`, or tap the active card to freeze scroll and take contextual margin notes.
- **Calm Atmospheres**: Switch effortlessly between warm **Paper** (`#FFFEFA`) and near-black **Dusk** (`#000000` / `#070708`) dark mode.

### 2. High-Throughput Visual OCR Engine
- **DeepSeek-OCR-2 Backend**: Batch-processes scanned PDFs in memory with dual-router Hugging Face failover.
- **Real-Time SSE Streaming**: Live page extraction updates, word count tracking, velocity metrics, and heartbeat keepalives.
- **Native Text Fast Path**: Digital PDF pages with selectable text bypass rasterization in sub-millisecond latency.
- **Cross-Page Chapter Reconstruction**: Automatically reassembles multi-page documents into coherent markdown chapters.

### 3. Behavioral Design & Retention
- **Variable Reward Marginalia Capsules**: Unannounced philosophical syntheses and cross-domain insights unlocked at chapter milestones.
- **Cognitive Flow Metrics**: Visual sparklines tracking deep reading stability without gamified badges.
- **Asynchronous Margin Social Layer**: Privacy-preserving in-margin thought whispers anchored to cryptographic paragraph hashes.

---

## Technology Stack

- **Frontend**: React, Vite, Lucide Icons, PDF.js, JSZip, Tesseract.js (WASM)
- **Backend**: FastAPI, Uvicorn, PyMuPDF (fitz), HTTPX, Pydantic v2
- **Testing & Quality**: Vitest (33 tests), ESLint, Pytest, Pyright strict typing

---

## Quick Start

### Frontend
```bash
npm install
npm run dev
```

### Backend
```bash
python -m venv backend/.venv
backend/.venv/Scripts/activate  # On Windows
pip install -r backend/requirements.txt
python backend/main.py
```

---

## Verification

```bash
npm run lint
npm run test
npm run build
```

---

## Privacy Invariant

Bookflow processes all documents locally on the user's device by default. No book contents are transmitted to external services or cloud databases without explicit user configuration.
