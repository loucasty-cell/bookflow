---
title: Invariants
type: rules
status: verified
updated: 2026-09-24
tags: [bookflow, agent, rules, invariants]
source-files: [AGENTS.md, goals.md, Bookflowideas.md, src/features/reader/config.js, src/features/reader/hooks/useReaderNavigation.js, src/features/library/lib/libraryStore.js]
---

# Invariants

Rules that hold regardless of feature direction. If a change conflicts with one of these,
stop and report the conflict instead of silently breaking it.

## Core product invariants

### 1. Local-first privacy

Process imported document contents locally by default. Never transmit book text to AI,
analytics, logs, or external services without explicit architectural approval.

- Standard parsing runs in-browser: `pdfjs-dist`, `jszip`, `tesseract.js`.
- The backend is opt-in. It activates for scanned pages the browser could not read.
- When remote OCR runs, the user is told that page images leave the device.
- Backend keeps zero content persistence and clears in-memory buffers on completion.

Related: [[Privacy Model]], [[Backend OCR Engine]].

### 2. React text nodes only

Render book text through React element trees. `dangerouslySetInnerHTML` is prohibited for
book contents. This is what makes untrusted documents safe to display.

- `formatParagraphText` in `src/features/reader/lib/textFormatter.js` returns React elements.
- Bionic and salience formatting also return element trees, never HTML strings.

Related: [[Bionic Reading]], [[Validation Rules]].

### 3. Focus rail

Scrolling pulls the active sentence or paragraph to `FOCUS_RAIL_RATIO = 0.38` of the reader
viewport. This is the central interaction, not a decoration.

- Implemented in `src/features/reader/lib/readingController.js` and `useScrollPosition.js`.
- Static regions such as intros and end matter scroll natively without snapping.

Related: [[Focus Rail]], [[Cognitive Ergonomics]].

## Reader experience rules

- Keep the active paragraph readable without harsh contrast.
- Never make non-active text inaccessible or illegible.
- Support scrolling, pointer, keyboard (`ArrowDown`/`ArrowUp`, `J`/`K`, `PageDown`/`PageUp`, `Space`/`Shift+Space`, `Escape`), and touch.
- A focused paragraph may also be pinned with click, tap, `Enter`, or `Space`; global `Space` navigates focus.
- Prevent horizontal overflow from 320px to 430px.
- Give focus, notes, and settings controls accessible names (`aria-label`, `aria-modal`).
- Respect `prefers-reduced-motion: reduce`.
- The default reader is calm: only resume, chapter, progress, reader text, bookmark or note,
  and settings are visible.
- Reward capsules and retention modals are opt-in only, disabled by default, never blocking
  reading, and must respect reduced motion.
- Bionic and salience formatting are opt-in, not default.
- Use deterministic progress, not variable-ratio rewards.

Related: [[Accessibility Rules]], [[Reward Capsules]], [[Ethical Guardrails]].

## Document processing rules

- Validate supported extensions (`.pdf`, `.epub`, `.txt`, `.md`) and the 50 MB limit before parsing.
- Keep PDF and EPUB parsing asynchronous and lazy-loaded.
- Preserve document order and useful chapter or page labels.
- Never silently discard large portions of a document. Unreadable pages must be reported.
- Use native PDF text as the source of truth and OCR only pages without selectable text.
- Treat document markup, archives, filenames, and metadata as untrusted input.

## Library and storage rules

- The local library stores metadata and reading statistics under `bookflow:library`, never book text.
- The durable-storage adapter is feature-local and currently does not imply that document content is persisted or re-opened automatically.
- A resume surface may request file re-selection; it must not claim the original file is available.

Related: [[Library and Reading Stats]], [[Storage and Persistence]].

Related: [[Validation Rules]], [[OCR Decision Tree]], [[Import Scheduler]].

## Backend rules

- Never run blocking CPU or I/O directly on the async event loop. Use `ThreadPoolExecutor` or `asyncio.to_thread`.
- Use a persistent `httpx.AsyncClient` with bounded keep-alive connections.
- Enforce `serialization_alias` and `validation_alias` plus `populate_by_name=True` on Pydantic v2 models.
- Prune stale jobs so memory does not grow without bound.

Related: [[Backend Architecture]], [[Backend OCR Engine]].

## Git and output rules

- Commit prefixes: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`.
- List changes as `-` bullets in the commit body.
- No co-author trailers. No emojis in code, commits, or development output.
- Do not commit or push unless the user explicitly requests it.

Related: [[Commit Conventions]].