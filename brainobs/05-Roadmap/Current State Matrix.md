---
title: Current State Matrix
type: reference
status: verified
updated: 2026-09-18
tags: [bookflow, roadmap, status, matrix]
source-files: [goals.md, features.md, scripts/bench.md, src/features/document-import/index.js, src/features/reader/config.js]
---

# Current State Matrix

The single source of truth for what Bookflow does today. When any note in this vault disagrees
with this table, this table is correct until it is updated with evidence.

## Reading experience

| Capability | Status | Evidence |
| --- | --- | --- |
| Multi-format import | Verified | PDF, EPUB, TXT, Markdown up to 50 MB with drag and drop |
| Local-first privacy | Verified | In-memory parsing across all default paths |
| Sentence and paragraph focus rail | Verified | `FOCUS_RAIL_RATIO = 0.42` |
| Pin and resume focus | Verified | Click, tap, `Space`, `Enter`, `Escape` |
| Static region handling | Verified | Front and end matter scroll without snapping |
| Scroll intent accumulation | Verified | `MAX_SCROLL_INPUT`, `SCROLL_INTENT_THRESHOLD`, `LINE_COOLDOWN` |
| Bionic fixation reading | Verified | `getFixationLength`, pure React tokenizer |
| Accessible typography | Verified | Serif, Sans, Atkinson Hyperlegible, OpenDyslexic |
| Letter tracking options | Verified | normal, wide, spacious |
| Theme atmospheres | Verified | Paper, Dusk, and additional exposed palettes |
| Selection context tooltip | Verified | Note, copy, bookmark |
| Margin notes | Verified | Persisted per document with quoted excerpt |
| Bookmarks | Verified | Paragraph id references |
| Deterministic progress | Verified | `readingProgress` from position |
| Reading time estimate | Verified | 230 words per minute |
| Editorial typography | Verified | Drop caps, keywords, pull quotes, insight boxes |
| Paragraph classification | Verified | `classifyParagraph` in `src/shared/lib/text.js` with `formatClassification`, 7 categories |
| 3D book cards and living shelf | Verified | `ThreeDBookCard.jsx`, `LivingShelf.jsx` with spring physics and proximity shadows |
| Curated shelf library | Verified | Three openable books on the landing page |
| Ambient visual layer | Verified | `AmbientDustCanvas`, `Brand`, `ThreeDButton` in shared components |
| Opening intro transition | Verified | `BookOpeningIntro`, skippable on click |

## Import and performance

| Capability | Status | Evidence |
| --- | --- | --- |
| Manifest-first progressive import | Verified | `documentManifest.js`, `importScheduler.js`, `importCoordinator.js` |
| Progressive import wired into app | Verified | `handleFile` routes PDFs through `progressivePdfImport` |
| Unit lifecycle and priority | Verified | `UNSEEN` to `READY`, `CURRENT` to `BACKGROUND` |
| Bounded concurrency | Verified | 1 mobile, 2 to 3 desktop by hardware concurrency |
| Cancellation | Verified | Per-unit `AbortController`, `cancelStale` on jump |
| Native PDF text fast path | Verified | Pages above the word threshold skip OCR |
| Damaged PDF tolerance | Verified | Tolerant parsing plus backend fallback |
| Local English OCR | Verified | Tesseract WASM, locally served assets |
| Bounded OCR workers | Verified | Worker pool capped, pages batched, cleanup called |
| Blocking parse fallback | Verified | `parseDocument` remains as a safety path |

## Backend OCR

| Capability | Status | Evidence |
| --- | --- | --- |
| Backend scan endpoint | Verified | `POST /api/ocr/scan` returns a job id immediately |
| SSE progress streaming | Verified | `initial`, `progress`, `completed`, `error` events |
| Heartbeat keepalives | Verified | 8 second interval |
| Job cancellation | Verified | `POST /api/ocr/cancel/{job_id}` |
| Batched rasterization | Verified | 16 page batches at 96 DPI via thread pool |
| Provider chain | Verified | PaddleOCR preferred, Hugging Face vision fallback |
| Retry and cold-start recovery | Verified | 3 attempts |
| Partial failure reporting | Verified | Failed pages returned and surfaced |
| Stale job pruning | Verified | TTL based cleanup |
| Document and reader endpoints | Verified | Parse, validate, segment, reading-time, health |

## Behavioral layer

| Capability | Status | Evidence |
| --- | --- | --- |
| Reward capsules | Verified | Opt-in, default `false` |
| 4-minute drop-off detection | Verified | 240000 ms stillness check |
| Intervention modal | Verified | Opt-in, default `false` |
| Social resonance | Planned | Endpoints specified, not built |
| Haptic feedback vocabulary | Verified | `triggerHaptic`, `HAPTIC_PATTERNS` in `src/shared/lib/haptics.js`, used by `FocusCard.jsx` and `SelectionTooltip.jsx` |
| Paragraph classification heuristic | Verified | `classifyParagraph` in `src/shared/lib/text.js`, 7 categories, unit tested in `text.test.js` |

## Reliability and quality

| Capability | Status | Evidence |
| --- | --- | --- |
| Error boundaries | Verified | Subtree and root isolation with reset |
| Safe storage fallback | Verified | `getSafeStorage()` with in-memory fallback |
| Code splitting | Verified | Vendor chunks plus lazy modals and parsers |
| Reduced motion support | Verified | Respected across the reader |
| Frontend unit tests | Verified | 15 test files, 64 tests |
| Backend test suite | Verified | 8 pytest modules |
| Pyright type checking | Verified | Expected zero errors |
| Performance marks | Verified | 7 named `bookflow:` measures |

## Gaps, stated plainly

| Gap | Impact |
| --- | --- |
| No persistent library | Return loop is weak; the curated shelf is static, not the user's own books |
| No durable large-document storage | Large books must be re-imported per session |
| No annotation export or import | Notes are confined to one browser profile |
| Paragraph id anchoring is fragile | Reordered re-parse can orphan annotations |
| No multi-column layout sorting | Two-column PDFs can interleave |
| English-only bundled OCR | Other languages unsupported locally |
| Not PWA-ready | No manifest, service worker, or offline install |
| No native wrappers | Web-polished only |
| Import speed unmeasured | Targets set, numbers not yet published |
| No session recap | Satisfaction stage of the habit loop is incomplete |

Detail: [[Backlog P0-P1-P2]], [[Success Metrics]], [[Competitor Analysis]].

## How to update this note

```text
1  Change the status only when code and runtime have been verified
2  Add the evidence column entry (file, constant, or command result)
3  Update the updated field in frontmatter
4  Follow [[Context Sync Protocol]] for the notes that reference the changed row
```