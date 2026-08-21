# Bookflow

<div align="center">
  <h3>Read in your rhythm.</h3>
  <p>A private, focus-driven document reading application that turns PDFs, EPUB ebooks, Markdown, and text files into a calm, sentence-focused reading experience.</p>
</div>

---

## 📖 Philosophy & Product Design

Designed with cognitive ergonomics and behavioral product design, Bookflow helps readers sustain deep-work focus and overcome digital distraction. It competes with short-form dopamine loops by providing an immersive reading environment with elegant physics, ambient interventions, and variable rewards.

## ✨ Key Features

### 1. Golden-Ratio Sentence Focus Rail
- **Scroll-Driven Focus**: As you scroll, a gentle highlight settles on the active sentence near the golden-ratio reading line, reducing saccadic regressions and visual fatigue.
- **Pin & Reflect**: Press `Escape`, `Space`, or tap the active card to freeze scroll and take contextual margin notes.
- **Calm Atmospheres**: Switch effortlessly between warm **Paper** and near-black **Dusk** dark mode.

### 2. Visual OCR
- **Private Local OCR**: Scanned English PDF pages use bundled Tesseract.js assets in the browser by default.
- **Optional Hugging Face OCR Backend**: Batch-processes scanned PDFs through a configured serverless Inference Provider model or a compatible dedicated/self-hosted endpoint.
- **Real-Time SSE Streaming**: Live page extraction updates, word count tracking, and heartbeat keepalives.
- **Intelligent Fast-Path**: Digital PDF pages with selectable text automatically bypass rasterization for sub-millisecond extraction.

### 3. Behavioral Interventions & Retention
- **Variable Reward Capsules**: Unannounced philosophical syntheses and cross-domain insights unlock beautifully via spring physics at chapter milestones.
- **Ambient Intervention Engine**: A non-intrusive toast that detects drop-off intent and gently pulls the reader back into flow.
- **Social Resonance**: A privacy-preserving in-margin asynchronous layer displaying community reflections anchored to cryptographic paragraph hashes.

---

## 🛠 Technology Stack & Architecture

Bookflow is engineered as a decoupled Full-Stack application, utilizing modern frameworks for high performance, physics-based UI, and async processing.

### Frontend
- **[Next.js (App Router)](https://nextjs.org/)**: Replaced Vite for robust application routing, un-opinionated server components, and superior production builds via Turbopack.
- **[Zustand](https://docs.pmnd.rs/zustand)**: Powers global state management (UI toggles, reading progress, hooks) with minimal boilerplate, completely decoupling heavy state from `App.jsx` and enabling pure component testing.
- **[Framer Motion](https://www.framer.com/motion/)**: Drives the `AnimatePresence` and spring-physics orchestrations for the ambient intervention toasts and variable reward capsules, providing Apple-tier UI fluidity.
- **[SWR](https://swr.vercel.app/)**: Used for lightweight, reactive data fetching and caching for the social resonance endpoints.
- **Core Processing**: `pdfjs-dist` (PDF extraction), `jszip` (EPUB parsing), `tesseract.js` (local WASM OCR fallback).

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)**: A hyper-fast, async-first Python backend managing the OCR pipeline and social resonance API.
- **[PyMuPDF (fitz)](https://pymupdf.readthedocs.io/)**: Handles instantaneous PDF parsing, in-memory 96 DPI rasterization, and coordinate geometry.
- **[HTTPX](https://www.python-httpx.org/)**: Configured with strict connection pooling (`max_keepalive_connections`) for highly concurrent, rate-limit resistant batch OCR requests to Hugging Face `vLLM` endpoints.
- **[Pydantic v2](https://docs.pydantic.dev/latest/)**: Enforces strict typing and data validation for API payloads.

---

## 🚀 Quick Start

### 1. Launch the Backend API

We've provided a seamless launch script for Windows that will automatically create a virtual environment (`venv`), install the dependencies, and start Uvicorn.

```bash
cd backend
start_backend.bat
```
*(The backend will run on `http://localhost:8000`)*

The standard importer and local English OCR do not require the backend. Optional remote scanning is disabled until you set `OCR_MODEL` to a currently supported Hugging Face serverless image-to-text model. Keep the default `HF_INFERENCE_URL` for the public Inference Provider, or replace it with the exact URL of a compatible dedicated endpoint.

### 2. Launch the Frontend Application

In a separate terminal, install the Node modules and start the Next.js development server:

```bash
npm install
npm run dev
```
*(The frontend will run on `http://localhost:3000`)*

---

## 🧪 Verification & Quality

Ensure code quality before contributing:

```bash
npm run lint    # Next.js ESLint checks
npm run test    # Vitest suite
npm run build   # Production Turbopack build
```

---

## 🛡 Privacy Invariant

Bookflow processes standard text extraction and local English OCR on-device by default. The optional remote OCR flow sends scanned page images to the configured backend only when the user explicitly starts an accelerated scan. A Hugging Face token alone is not enough: `OCR_MODEL` must identify a model currently exposed by the selected endpoint.
