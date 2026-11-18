# Google AI Studio Gate & Directive

This directive governs development, evaluation, and iteration of **Bookflow** when imported into **Google AI Studio**, **Project IDX**, or lightweight web/sandbox environments.

---

## 1. Executive Environment Directive

When working in Google AI Studio or browser sandboxes:

1. **Frontend-First Priority**: Focus primarily on the React 19 + Vite 8 frontend (`src/`). Ensure UI rendering, reader ergonomics, bionic reading fixations, and local document parsing operate flawlessly.
2. **Optional Backend / Zero-Friction Gate**: The Python FastAPI service (`backend/main.py`) provides accelerated OCR and vision model streaming. In Google AI Studio, running the full Python/Docker stack is **optional**.
3. **Automated Mock Gate Active**: When the FastAPI service is not running on port 8000, Vite automatically catches proxy connection errors and serves high-fidelity mock data (SSE streams for Reading Lens, OCR scan progress, social pulse, and health endpoints).
4. **Minimal Backend Changes**: Only edit `backend/` files when fixing schemas, Pydantic contracts, or lightweight router logic required for frontend-backend parity. Never attempt to install heavy GPU, CUDA, or PaddleX libraries in standard AI Studio web containers.

---

## 2. Architecture & Invariants

| Invariant | Specification | Rule |
| :--- | :--- | :--- |
| **Local-First Privacy** | Book text remains on user's device | Never send full book text to external cloud APIs without explicit user consent. |
| **Safe Rendering** | React text node tree | Never use `dangerouslySetInnerHTML` for book contents or user annotations. |
| **Focus Rail** | `FOCUS_RAIL_RATIO = 0.38` | Scrolling anchors the active sentence/paragraph at 38% of viewport height. |
| **Local Parsing** | WASM in-browser | PDFs (`pdfjs-dist`), EPUBs (`jszip`), and scanned text (`tesseract.js`) parse client-side. |
| **On-Device Permanence** | OPFS & IndexedDB (`offlineBooks.js`) | Caches up to 20 recent books on-device for instant resume without file repicking. |

---

## 3. Mock & Dummy Data Fallback Strategy

The Vite development server provides an automatic **AI Studio Mock Gate**:

- **Reading Lens (`/api/reading-lens`)**:
  - Intercepts SSE streaming requests.
  - Returns simulated streaming responses tailored to actions (`summarize`, `explain`, `translate`, `trivia`).
  - Allows full end-to-end testing of `FocusCard`, `LensBar`, and reader overlays without an active Gemini API key.
- **Accelerated OCR Fallback (`/api/ocr/*`)**:
  - Returns simulated multi-page OCR jobs and streams real-time progress events up to 100%.
  - Emits sample markdown to verify `OcrUploader` and reader mounting flows.
- **Social Scaffolds (`/api/social/*`)**:
  - Returns simulated session pulse and paragraph resonance counts.
- **Health Check (`/api/health`)**:
  - Returns `{ "status": "healthy", "mode": "ai-studio-gate" }`.

To force mock mode even if port 8000 is open:
```bash
VITE_AI_STUDIO_MODE=true npm run dev
```

---

## 4. Verification Pipeline

Run the available verification checks:

```bash
# 1. Static Typecheck (TypeScript compiler)
npm run typecheck

# 2. Frontend Unit & Integration Tests (Vitest - 573 tests)
npm test

# 3. Code Style & Linting (ESLint 9)
npm run lint

# 4. Production Build Verification (Vite 8)
npm run build

# 5. Obsidian Second-Brain Vault Integrity Check
npm run check:vault

# 6. (Optional) Backend Pytest Suite (when Python environment is available)
pytest backend/tests/
```

---

## 5. File Placement Protocol

- **Reader Core**: `src/features/reader/` (components, hooks, lib)
- **Document Import**: `src/features/document-import/` (parsers, manifest, scheduler)
- **Library & Storage**: `src/features/library/` (resume card, offline books, durable storage)
- **Reading Lens Bar**: `src/features/lens-bar/` (draggable bar, consent, quick actions)
- **Design Tokens & Styles**: `src/styles/`
- **Obsidian Second Brain**: `brainobs/`
