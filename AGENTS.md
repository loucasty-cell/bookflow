# Bookflow Development Guide & AI Agent Directive

Follow this file whenever modifying Bookflow. Apply the global rules first, then the project-specific rules.

---

## ⚡ Executive Quick-Start for AI Agents

When reading or modifying this repository, orient yourself immediately with these core boundaries:

```text
bookflow/
├── src/                               # React 19 + Vite 8 Frontend
│   ├── main.jsx                       # Root DOM mount with ErrorBoundary
│   ├── App.jsx                        # Root feature composer & library state
│   ├── styles.css                     # Semantic CSS design tokens & themes
│   ├── components/                    # Lazy-loaded modals (OcrUploader, VariableRewardCapsule)
│   ├── features/
│   │   ├── reader/                    # Core Reading Engine
│   │   │   ├── components/            # ReaderPage, SettingsPanel, NotesPanel, ContentsPanel
│   │   │   └── lib/                   # textFormatter (Bionic), useScrollPosition, readingController
│   │   ├── document-import/           # Client-side parsers (PDF.js, JSZip, Tesseract WASM)
│   │   └── landing/                   # Hero intake, drag-and-drop zone, sample books
│   ├── shared/lib/                    # storage.js (safe localStorage fallback), text.js
│   └── store/                         # Zustand global stores (readerStore, uiStore)
└── backend/                           # FastAPI + Python 3.11/3.12 Backend
    ├── main.py                        # High-concurrency OCR router & SSE pipeline
    ├── app/                           # Routers, Pydantic v2 schemas, and services
    └── tests/                         # Pytest test suite (34 tests)
```

### Core Invariants:
1. **Local-First Privacy**: Book text stays on user's device. Never send book contents to cloud services without explicit approval.
2. **React Text Nodes Only**: Render book text safely via React element trees. Never use `dangerouslySetInnerHTML` for book contents.
3. **Sentence/Paragraph Golden Ratio Focus**: Scrolling pulls the active sentence/paragraph into focus at `FOCUS_RAIL_RATIO = 0.42`.

---

## Global Rules

- Do not add `Co-Authored-By` or other co-author messages to commits.
- Do not use emojis in code, commits, or user-facing development output.
- Keep responses concise and omit unnecessary preambles.
- Search the repository before writing code.
- Read a file before editing it.
- Follow neighboring patterns and existing formatting.
- Do not add code comments unless the user explicitly asks for them.
- Do not add dependencies unless the user explicitly approves them.
- Never log or commit secrets, API keys, tokens, credentials, or private documents.
- Edit existing files when practical. Create files only when the requested change or established structure requires them.
- Ask for clarification instead of guessing when project documentation and existing patterns do not resolve an important decision.

---

## Commit Rules

Prefix every commit subject with one of these conventional types:

- `feat`: add a user-facing feature.
- `fix`: correct or edit existing behavior.
- `refactor`: reorganize code without changing behavior.
- `docs`: change documentation.
- `test`: add or edit tests.
- `chore`: change dependencies, build scripts, or other non-source maintenance.
- `style`: change or fix visual layout and CSS.

List the included changes as `-` bullets in the commit body.

```text
refactor: organize the reader by feature

- separate reader panels from application state
- move shared utilities behind public exports
```

---

## Product Purpose & Technology Stack

Bookflow is a private, browser-based reading application that turns PDFs, EPUB ebooks, text files, and Markdown into a calm, sentence-focused reading experience.

### Active Technology Stack:
- **Frontend**: React 19, Vite 8, Zustand (persisted state), Framer Motion, SWR, Lucide React.
- **Local Parsing**: `pdfjs-dist` (local worker), `jszip` (EPUB parsing), `tesseract.js` WASM (on-device OCR fallback).
- **Typography & Ergonomics**: Bionic Reading fixations (`textFormatter.js`), accessible typefaces (Atkinson Hyperlegible, OpenDyslexic), and variable letter tracking.
- **Testing & Quality**: Vitest (44 tests across 12 suites), ESLint.
- **Backend (Optional / Accelerated)**: FastAPI, Uvicorn ASGI, PyMuPDF (fitz) thread pool rasterization, PaddleOCR worker (`Dockerfile.ocr`), vLLM / Hugging Face OpenAI-compatible vision payloads (Qwen2-VL / DeepSeek-OCR-2), Server-Sent Events (SSE), Docker Compose.

---

## Feature Boundaries & Architecture

- Keep each feature self-contained in `src/features/<feature-name>/`.
- Do not import another feature's internal files. Import through that feature's `index.js` public API.
- Put code in `src/shared/` only when at least two features use it.
- Keep `App.jsx` focused on application state and feature composition.
- Keep reusable storage and text utilities in `src/shared/lib/`.
- Keep document parsing inside `src/features/document-import/`.

---

## Reader Experience Rules

- Keep the active sentence readable without harsh contrast.
- Do not make non-active text inaccessible.
- Support scrolling, pointer input, keyboard input (`Down`/`Up`/`J`/`K`/`Space`/`Escape`), and touch layouts.
- Prevent horizontal overflow at all mobile widths (`320px` to `430px`).
- Give focus, notes, and settings controls accessible names (`aria-label`, `aria-modal`).
- Respect `prefers-reduced-motion: reduce`.
- Avoid noisy animations, badges, popups, or gamification that competes with reading.

---

## Document-Processing Rules

- Validate supported extensions (`.pdf`, `.epub`, `.txt`, `.md`) and 50 MB size limit before parsing.
- Keep PDF and EPUB parsing asynchronous and lazy-loaded.
- Preserve document order and useful chapter or page labels.
- Never silently discard large portions of a document.
- Use native PDF text as the source of truth and OCR only pages without selectable text.
- Treat document markup, archives, filenames, and metadata as untrusted input.

---

## Required Verification Pipeline

Run the available checks before committing:

```bash
# Frontend quality & build checks
npm run lint
npm test
npm run build

# Backend verification checks
pytest backend/tests/
```

For reader, parser, or visual changes, verify:
- A representative document imports successfully.
- Sentence focus follows the reading position.
- Bionic reading fixations and typeface selections apply cleanly.
- Notes, bookmarks, and settings persist across reloads.
- Desktop and mobile layouts remain usable with zero horizontal overflow.
