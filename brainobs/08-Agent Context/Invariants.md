---
title: Invariants
type: rules
status: verified
updated: 2026-10-02
tags: [bookflow, agent, rules, invariants]
source-files: [AGENTS.md, src/features/reader/config.js, src/features/reader/lib/readingController.js, src/features/reader/lib/textFormatter.js, src/features/library/lib/libraryStore.js, src/features/library/lib/durableStorage.js, backend/app/routers/reader.py, backend/app/core/config.py]
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

- The constant lives at `src/features/reader/lib/readingController.js:1`.
- Its siblings in the same file are `MAX_SCROLL_INPUT = 64` (`:2`),
  `SCROLL_INTENT_THRESHOLD = 96` (`:3`), and `LINE_COOLDOWN = 240` (`:4`).
- Static regions such as intros and end matter scroll natively without snapping.

Changing `0.38` changes the core reading feel. Do not tune it without an explicit request.

Related: [[Focus Rail]], [[Cognitive Ergonomics]].

### 4. Reading Lens egress is opt-in per session

A Reading Lens request leaves the device only when all of these hold.

- The reader has made a selection. No selection means no request.
- The reader has granted consent. The panel stays local until consent is given.
- The backend requires `consent: true`. `backend/app/routers/reader.py:338` raises
  `403` at `:340` **before** `settings.gemini_api_key` is read at `:347`.
- The passage is bounded. `reader.py:60` caps `passage` at
  `LENS_MAX_PASSAGE_CHARS`, taken from `settings.reading_lens_max_passage_chars`
  (`backend/app/core/config.py:84`).

No provider key may ever reach the browser bundle. All remote Lens traffic goes through the
backend.

Related: [[Reading Lens]], [[Reading Lens Bar]], [[Privacy Model]].

## Default-off flags

`src/features/reader/config.js` `DEFAULT_SETTINGS` is the contract for what a new user sees.
Verified against that file:

| Flag | Default | Line |
| --- | --- | --- |
| `bionic` | `false` | `:12` |
| `showRewardCapsules` | `false` | `:15` |
| `showInterventionModals` | `false` | `:16` |
| `showSessionRecap` | `false` | `:19` |
| `showAchievements` | `false` | `:20` |
| `showDefinitionLookup` | `false` | `:21` |
| `enableAnnualGoal` | `false` | `:23` |
| `useProgressiveImport` | `true` | `:17` |
| `showResumeCard` | `true` | `:18` |

Adding a flag is not neutral. Every new reader-facing flag defaults to `false` unless the user
explicitly asked for it on.

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

Related: [[Validation Rules]], [[OCR Decision Tree]], [[Import Scheduler]].

## Library and storage rules

- The local library stores metadata and reading statistics under `bookflow:library`
  (`src/features/library/lib/libraryStore.js:13`), never book text.
- The library holds at most `60` entries (`libraryStore.js:15`).
- The durable adapter is feature-local, targets the `bookflow-durable` IndexedDB database
  (`src/features/library/lib/durableStorage.js:1`), and currently does not imply that document
  content is persisted or re-opened automatically.
- A resume surface may request file re-selection; it must not claim the original file is
  available.

Related: [[Library and Reading Stats]], [[Storage and Persistence]].

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
- Never edit vault notes with a shell write. A PowerShell `Set-Content` rewrite adds a UTF-8
  BOM and breaks `scripts/check-vault.mjs`, whose frontmatter parser requires the file to start
  with `---`. Use an editor-style write, then run `npm run check:vault`.

Related: [[Commit Conventions]], [[Vault Maintenance]].