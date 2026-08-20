# Bookflow Product Goals

This document separates the verified product today from the work Bookflow should pursue next. Planned items are not implemented until code and validation prove otherwise.

## Product vision

Bookflow should make long-form reading feel calm and sustainable. It turns a local book file into a private reading space where one eligible paragraph receives gentle emphasis near the reader's natural upper-page focus area while scrolling.

## Non-negotiable goals

1. Keep imported book contents on the user's device by default.
2. Preserve scroll-driven paragraph focus as the central experience.
3. Keep the active paragraph readable and softly highlighted without hiding nearby context.
4. Support keyboard, pointer, touch, desktop, tablet, and mobile use.
5. Avoid unnecessary services, tracking, dependencies, and visual distractions.
6. Describe current and planned features accurately.

## Current goals already covered

| Goal | Current status |
| --- | --- |
| Import PDF, EPUB, TXT, and Markdown | Implemented for files up to 50 MB |
| Keep document parsing local | Implemented in the browser |
| Paragraph-level reading focus | Implemented using eligible paragraph boundaries |
| Scroll-based focus movement | Implemented near 42% of the reader viewport |
| Prevent pointer hover from changing focus | Implemented |
| Pin and resume a paragraph | Implemented |
| Bookmark focused paragraphs | Implemented with local browser storage |
| Add and delete margin notes | Implemented with local browser storage |
| Restore progress for the same file | Implemented using file metadata as a document identifier |
| Compact page navigation | Implemented with current/total, slider, and previous/next controls |
| Ignore likely non-body sections | Implemented as a heading, position, and length heuristic |
| Preserve Markdown and EPUB subheading structure | Implemented for one level with a flat paragraph compatibility list |
| Free-scroll static introductions in Focus mode | Implemented with native wheel, touch, and keyboard scrolling |
| Reader customization | Implemented for font size, line height, width, focus level, and atmosphere |
| Responsive reader | Implemented for desktop and mobile layouts |
| Private sample experience | Implemented without an account |
| High-throughput visual OCR scanning | Implemented via DeepSeek-OCR-2 on vLLM with SSE real-time progress streaming |
| OCR native text fast path | Implemented; pages with 15+ selectable words bypass rasterization in sub-millisecond latency |
| Frontend OCR upload modal | Implemented with drag-and-drop, real-time SSE progress, page viewer, search, and Markdown export |
| OCR-to-reader integration | Implemented; OCR Markdown output loads directly into the reader with automatic chapter title extraction |
| Real-time SSE progress streaming | Implemented with per-page updates, pages-per-second throughput, and heartbeat keepalives |
| Backend type safety | Implemented; Pyright zero errors with Pydantic v2 `serialization_alias` + `validation_alias` pattern |
| Automated test suites | Implemented; 16 backend pytest tests and 33 frontend Vitest tests passing |

## Near-term goals

### P0: Reading correctness

- Improve repeated PDF header, footer, and page-number detection without discarding real text.
- Add direct automated tests for front-matter and end-matter eligibility rules.
- Improve paragraph reconstruction for PDFs with columns, unusual line spacing, and hyphenated words.
- Preserve the user's exact reading position more reliably when typography settings change.
- Add a visible manual override when automatic front/end-matter detection is wrong.

Success means representative books keep their reading order, selectable body text, and correct focus behavior without silently losing content.

### P1: Library and continuity

- Add an optional local library of recently opened document metadata.
- Let users rename a local library entry without changing the original file.
- Add bookmark and note navigation back to the related paragraph.
- Export and import notes and bookmarks as a user-controlled file.
- Add a clear action to delete saved progress for one book or all books.

The library should store metadata and reading state only unless the user explicitly chooses persistent local file storage.

### P1: Accessibility and comfort

- Add a reduced-motion mode that also respects `prefers-reduced-motion`.
- Add high-contrast focus alternatives that retain the Bookflow palette.
- Improve screen-reader announcements for page changes, pinned focus, saved bookmarks, and notes.
- Add keyboard shortcuts with a discoverable help panel.
- Test zoom, reflow, and focus order at supported mobile widths.

### P2: OCR improvements

- Add local ONNX Runtime inference for air-gapped, zero-network OCR acceleration.
- Add layout and reading-order analysis for multi-column PDFs (academic journals, two-column textbooks).
- Add multilingual sentence segmentation for non-Latin scripts (CJK, Arabic, Cyrillic).
- Add in-memory SHA-256 OCR cache for deduplicating repeated scans.
- Improve OCR accuracy feedback with per-page confidence scoring.

### P2: Format quality

- Improve EPUB navigation using its table of contents when available.
- Preserve basic emphasis and block quotations with a safe structured representation.
- Evaluate additional formats only when a real user need is confirmed.

## Long-term goals requiring explicit approval

- Optional account-based synchronization across devices.
- End-to-end encrypted cloud backup for reading state.
- Collaborative notes or reading groups.
- AI-assisted summaries, questions, or explanations.
- Analytics or product telemetry.
- Containerized deployment with Docker Compose.

These goals require a separate privacy and security design. Book text must never be uploaded silently, and AI or analytics must remain opt-in with a clear data boundary.

## Out of scope for the current product

- Digital-rights-management bypass.
- Uploading or distributing copyrighted books.
- Pretending image-only PDFs contain readable text without OCR.
- Automatic AI processing of imported book text.
- Social feeds, streak pressure, or gamification that competes with reading.

## Definition of future feature completion

A roadmap item is complete only when:

- Its behavior is implemented and manually verified.
- Relevant automated tests pass.
- Privacy, accessibility, and error states are addressed.
- Desktop and mobile behavior are checked when the UI changes.
- `README.md`, `api.md`, and `detailsinfo.md` are updated when their contracts or claims change.
- Lint, tests, and the production build pass.
