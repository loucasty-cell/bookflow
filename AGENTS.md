# Bookflow Development Guide & AI Agent Directive

Follow this file whenever modifying Bookflow. Apply the global rules first, then the project-specific rules.

---

## ⚡ Executive Quick-Start for AI Agents

When reading or modifying this repository, orient yourself immediately with these core boundaries:

```text
bookflow/
├── src/                               # React 19 + Vite 8 Frontend
│   ├── main.jsx                       # Root DOM mount with ErrorBoundary
│   ├── App.jsx                        # Root composer and import/library lifecycle owner
│   ├── styles.css                     # Semantic CSS design tokens and themes
│   ├── components/                    # Cross-feature lazy modals and compatibility wrappers
│   ├── features/
│   │   ├── reader/                    # Core reading engine
│   │   │   ├── components/            # Reader shell, page, focus card, panels, tooltip
│   │   │   ├── hooks/                 # Session, navigation, input, measurement, persistence, annotations, chapter window
│   │   │   └── lib/                   # Focus, viewport, scroll, formatting, dictionary, reading time
│   │   ├── document-import/           # Client parsers, manifest, scheduler, coordinator, OCR session
│   │   │   ├── components/            # OCR uploader and result viewer
│   │   │   ├── hooks/                 # useDocumentImport and useOcrSession
│   │   │   └── lib/                   # Validation, parsers, manifest, scheduler, local OCR, normalization
│   │   ├── library/                   # Metadata library, stats/goals/achievements, resume surfaces
│   │   │   ├── components/            # ResumeCard, SessionRecap, BadgeGallery
│   │   │   ├── hooks/                 # useReadingSession
│   │   │   └── lib/                   # Metadata, stats, speed, goals, achievements, durable adapter
│   │   └── landing/                   # Hero intake, drag-and-drop zone, sample books
│   ├── shared/lib/                    # Safe storage, text, haptics, focus management, perf marks
│   └── store/                         # Zustand global stores (readerStore, uiStore)
└── backend/                           # FastAPI + Python 3.11/3.12 Backend
    ├── main.py                        # Runnable OCR router and SSE pipeline
    ├── app/                           # Routers, Pydantic v2 schemas, and services
    └── tests/                         # Pytest suite (75 tests across the reader, Lens, PDF-guard, and OCR modules)
```

### Core Invariants:
1. **Local-First Privacy**: Book text stays on user's device. Never send book contents to cloud services without explicit approval.
2. **React Text Nodes Only**: Render book text safely via React element trees. Never use `dangerouslySetInnerHTML` for book contents.
3. **Sentence/Paragraph Focus Rail**: Scrolling pulls the active sentence or paragraph to `FOCUS_RAIL_RATIO = 0.38` of the reader viewport.

### Current Refactor Status
- Reader session, navigation, input, measurement, persistence, annotations, static regions, and long-book windowing are extracted into `src/features/reader/hooks/`.
- Document import has feature-local parsers, manifest, scheduler, coordinator, components, and OCR-session hooks.
- The local library has its own feature boundary and public `index.js`; it stores metadata and measured session totals, not book text.
- `App.jsx` remains the root composer; import, session, annotation, static-region, and view concerns are extracted into feature hooks/components. This decomposition is complete for the current refactor scope.
- `backend/main.py` is the runnable OCR entrypoint, while `backend/app/` contains modular routers and services.

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

## Skills And MCP Rules

- Project skills are discovered only under `.agents/skills/`; verify with `npx skills@latest list`.
- Do not recreate an `agent/skills/` duplicate tree and do not commit a second lockfile.
- MCP configuration lives in the ignored local `opencode.json`; it must never be staged, printed, or committed.
- Figma evidence must cite a real file key and node id. Never invent a node id, spacing value, or design token.
- Rotate any design-tool or provider credential that appears in a transcript, log, or commit.

## Subagent Evidence Protocol

Every delegated task must follow this protocol:

- Read the relevant files before making a claim or edit.
- Cite concrete evidence as `path:line`, a measured command result, or a Figma node/file key.
- Distinguish verified facts, reasonable inferences, and unknowns; never present an inference as measured fact.
- Run the narrowest useful verification command and report the exact result, including failures.
- Do not invent APIs, model names, design tokens, test results, or file contents.
- Do not claim a task is complete because a diff looks plausible; verify the behavior or mark the gap explicitly.
- Keep edits inside the assigned file boundary and report every touched file.

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
- **Frontend**: React 19, Vite 8, Zustand (persisted state), Framer Motion, SWR, Lucide React, Three.js ambient layer, Tailwind CSS utility layer.
- **Local Parsing**: `pdfjs-dist` (local worker), `jszip` (EPUB parsing), `tesseract.js` WASM (on-device OCR fallback).
- **Typography & Ergonomics**: Bionic Reading fixations (`textFormatter.js`), accessible typefaces (Atkinson Hyperlegible, OpenDyslexic), and variable letter tracking.
- **Testing & Quality**: Vitest (36 test files, 251 tests, measured 2026-09-25), ESLint, Playwright (2 smoke tests, the 420-page long-import test, and 2 Reading Lens responsive tests, run with `PLAYWRIGHT_CHANNEL=chrome`).
- **Backend (Optional / Accelerated)**: FastAPI, Uvicorn ASGI, PyMuPDF (fitz) thread pool rasterization, PaddleOCR worker (`Dockerfile.ocr`), vLLM / Hugging Face OpenAI-compatible vision payloads (Qwen2-VL / DeepSeek-OCR-2), Server-Sent Events (SSE), Docker Compose.

---

## Feature Boundaries & Architecture

- Keep each feature self-contained in `src/features/<feature-name>/`.
- Do not import another feature's internal files. Import through that feature's `index.js` public API.
- Put code in `src/shared/` only when at least two features use it.
- Keep `App.jsx` focused on application state and feature composition.
- Keep reusable storage and text utilities in `src/shared/lib/`.
- Keep document parsing inside `src/features/document-import/`.
- Keep the metadata library and durable-storage adapter inside `src/features/library/`; adapter presence does not mean document text is currently persisted.

---

## Reader Experience Rules

- Keep the active sentence readable without harsh contrast.
- Do not make non-active text inaccessible.
- Support scrolling, pointer input, keyboard input (`ArrowDown`/`ArrowUp`, `J`/`K`, `PageDown`/`PageUp`, `Space`/`Shift+Space`, `Escape`), and touch layouts. `Enter` or `Space` on a focused paragraph toggles its pin; global `Space` navigates focus.
- Prevent horizontal overflow at all mobile widths (`320px` to `430px`).
- Give focus, notes, and settings controls accessible names (`aria-label`, `aria-modal`).
- Respect `prefers-reduced-motion: reduce`.
- The default reader must be calm: only resume, chapter, progress, reader text, bookmark/note, and settings visible.
- Reward capsules and retention modals are opt-in only, disabled by default, never blocking reading, and must respect reduced-motion.
- Bionic/salience formatting is opt-in, not the default.
- Use deterministic progress, not variable-ratio rewards.
- Reading Lens egress is opt-in per session: no selection means no request, the panel stays local until the reader grants consent, and the backend requires `consent: true` plus a bounded passage.
- Never place a provider key in the browser bundle; all remote Lens traffic goes through the backend.

---

## Document-Processing Rules

- Validate supported extensions (`.pdf`, `.epub`, `.txt`, `.md`) and the 50 MB size limit before parsing.
- Keep PDF and EPUB parsing asynchronous and lazy-loaded.
- PDF progressive import is the default app path; EPUB, TXT, and Markdown currently use the blocking parser in `handleFile`, although progressive coordinators are exposed.
- The progressive PDF coordinator may resolve its first ready unit internally, but the app waits for a terminal 100% import state before opening the reader. The reader is never mounted pre-terminal.
- Backend OCR is an explicit user-started action. A local parsing error does not automatically upload the document or call the backend; the user must choose optional accelerated OCR.
- Preserve document order and useful chapter or page labels.
- Never silently discard large portions of a document.
- Use native PDF text as the source of truth and OCR only pages without selectable text.
- Treat document markup, archives, filenames, and metadata as untrusted input.

---

## Required Verification Pipeline

Run the available checks before committing:

```bash
# Frontend quality, browser, and build checks
npm run lint
npm test
npm run build
npm run check:vault

# Browser checks (system Chrome channel; bundled Chromium download is unreliable here)
$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e

# Backend verification checks
pytest backend/tests/
npx --no-install pyright
```

For reader, parser, or visual changes, verify:
- A representative document imports successfully.
- Sentence focus follows the reading position.
- Bionic reading fixations and typeface selections apply cleanly.
- Notes, bookmarks, and settings persist across reloads.
- Desktop and mobile layouts remain usable with zero horizontal overflow.
- Reading Lens stays local-only until consent, and the card stays inside the viewport at `320px`, `390px`, and desktop widths.

Known non-failing signals on the current baseline: `pyright` reports two environment warnings, `npm run build` warns about the large main and Three.js chunks, and full `npm audit` reports dev-only findings while `npm audit --omit=dev` is clean.
