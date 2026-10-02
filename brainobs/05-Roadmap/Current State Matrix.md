---
title: Current State Matrix
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, roadmap, status, matrix]
source-files: [goals.md,features.md,scripts/bench.md,src/App.jsx,src/features/document-import/index.js,src/features/document-import/hooks/useDocumentImport.js,src/features/document-import/lib/importCoordinator.js,src/features/reader/config.js,src/features/reader/hooks/useChapterWindow.js,src/features/reader/lib/readingController.js,src/features/reader/lib/progressLabel.js,src/features/reader/lib/notesPdfExport.js,src/features/reader/components/CommandPalette.jsx,src/features/library/index.js,src/features/library/hooks/useReadingSession.js,src/features/library/components/RecentShelf.jsx,src/features/library/lib/readingSpeed.js,src/features/lens-bar/index.js,src/features/widgets/index.js,src/features/scroll/index.js,src/shared/graphics/quality.js,tests/e2e/smoke.spec.js,tests/e2e/long-import.spec.js,tests/e2e/lens-bar.spec.js,playwright.config.js,vitest.config.js,scripts/security/contrast.mjs,backend/main.py,backend/tests]
---

# Current State Matrix

The single source of truth for what Bookflow does today. When any note in this vault disagrees
with this table, this table is correct until it is updated with evidence.

## Feature boundaries

`src/features/` holds seven features, each with an `index.js` barrel. Import through the barrel;
never reach into another feature's internals.

| Feature | Surface |
| --- | --- |
| `reader` | Reading engine, focus rail, panels, overlays |
| `document-import` | Parsers, manifest, scheduler, coordinator, OCR session |
| `library` | Metadata store, stats, goals, achievements, durable adapter, resume surfaces |
| `landing` | Hero intake, drop zone, sample books, `RecentShelf` |
| `lens-bar` | Draggable Lens question bar, consent, request, position, store |
| `widgets` | Home widget specs, motion tokens, reveal hooks |
| `scroll` | Lenis wrapper and reader smooth-scroll entry points |

## Reading experience

| Capability | Status | Evidence |
| --- | --- | --- |
| Multi-format import | Verified | PDF, EPUB, TXT, Markdown up to 50 MB with drag and drop |
| Local-first privacy | Verified | Import and OCR stay local. The Reading Lens requires explicit `consent: true` before a passage is sent, and refuses with 403 otherwise. See [[Backend Endpoints]]. |
| Sentence and paragraph focus rail | Verified | `FOCUS_RAIL_RATIO = 0.38` in `src/features/reader/lib/readingController.js`. See [[Focus Rail]]. |
| Pin and resume focus | Verified | Click/tap, focused-paragraph `Enter`/`Space`, `Escape`, Resume control; pin is transient and not persisted |
| Static region handling | Verified | Front and end matter scroll without snapping |
| Long-book chapter windowing | Verified | `useChapterWindow` keeps a bounded chapter window above 1,500 paragraphs with spacers |
| Scroll intent accumulation | Verified | `MAX_SCROLL_INPUT`, `SCROLL_INTENT_THRESHOLD`, `LINE_COOLDOWN` |
| Bionic fixation reading | Verified | `getFixationLength`, pure React tokenizer |
| Accessible typography | Partial | Serif, Sans, Atkinson Hyperlegible, OpenDyslexic settings exist; licensed local font files are not fully bundled |
| Letter tracking options | Verified | normal, wide, spacious |
| Theme atmospheres | Verified | Paper, Dusk, and additional exposed palettes |
| Selection context tooltip | Verified | Note, copy, bookmark |
| Reading Lens | Verified | Draggable focus card, selection hook, quick actions, consent gate, and Gemini SSE proxy all work. The 2026-09-25 repair pass closed the build, transport, consent, and drag gaps. See [[Reading Lens]]. |
| Lens bar | Verified | Draggable question bar in `src/features/lens-bar/`: grip, capped input, three-choice consent, mode menu, theme resolution, keyboard movement, and hostile-markup escaping. 14 browser tests in `tests/e2e/lens-bar.spec.js`. See [[Reading Lens Bar]]. |
| Command palette | Verified | `src/features/reader/components/CommandPalette.jsx` with `filterCommands`; opens from the reader. One known lint warning at that file's line 12. See [[Command Palette]]. |
| Notes PDF export | Verified | `notesPdfExport.js` paginates long notes across pages and sanitizes unsupported glyphs; `notesExport.js` owns the filename and download behaviour. |
| Margin notes | Verified | Persisted per document with quoted excerpt |
| Bookmarks | Verified | Paragraph id references |
| Deterministic progress | Verified | `readingProgress` from position |
| Time left in chapter | Verified | `progressLabel.js` renders `N min left`; speed inputs come from `readingSpeed.js` |
| Reading time estimate | Verified | `DEFAULT_WORDS_PER_MINUTE = 230` in `src/features/library/lib/readingSpeed.js` |
| Smooth scroll layer | Verified | `src/features/scroll/` wraps Lenis behind `startReaderSmoothScroll` / `useReaderSmoothScroll`; 18.60 kB `lenis` chunk, never in the entry bundle |
| Home widgets | Verified | `src/features/widgets/` with spec files, motion tokens, and reveal hooks. See [[Home Widgets]]. |
| Editorial typography | Verified | Drop caps, keywords, pull quotes, insight boxes |
| Paragraph classification | Verified | `classifyParagraph` in `src/shared/lib/text.js` with `formatClassification`, 7 categories |
| 3D book cards and living shelf | Verified | `ThreeDBookCard.jsx`, `LivingShelf.jsx` with spring physics and proximity shadows |
| Curated shelf library | Verified | Three openable books on the landing page |
| Local metadata library | Verified | `bookflow:library`, 60-entry cap, shelves, session totals |
| Resume card | Partial | Metadata-only `ResumeCard`; current app action requests source-file re-selection |
| Measured session statistics | Verified | `useReadingSession`, `readingStats.js`; measured words/time/session totals, no idle inflation |
| Measured local reading speed | Verified | `readingSpeed.js` exports `createSpeedTracker`, `computeWordsPerMinute`, `blendPace`, `minutesForWords`, `IDLE_GAP_MS = 45000`, `MIN_SAMPLES_FOR_CONFIDENCE = 3`; clamped 60 to 900 wpm |
| Opt-in goals and deterministic achievements | Verified | `readingGoals.js`, `achievements.js`, `BadgeGallery`; settings default off |
| Local definition lookup | Partial | Starter lexicon in `dictionary.js` with opt-in `SelectionTooltip` action; licensed dataset is not wired |
| Durable document storage | Partial | OPFS/IndexedDB adapter exists in `durableStorage.js`; not wired to app lifecycle |
| Recent books shelf | Verified | `src/features/library/components/RecentShelf.jsx`, exported from `src/features/library/index.js` and rendered by `LandingPage.jsx`; no `backlog-3` marker remains |
| Device-tier ambient canvas | Verified | `AmbientDustCanvas` reads `QUALITY_TIERS` from `src/shared/graphics/quality.js`; static tier and `prefers-reduced-motion` render one frame and stop, Three.js is a lazy `vendor-three` chunk off the entry |
| Ambient visual layer | Verified | `AmbientDustCanvas`, `Brand`, `ThreeDButton` in shared components |
| Opening intro transition | Verified | `BookOpeningIntro`, skippable on click |

## Import and performance

| Capability | Status | Evidence |
| --- | --- | --- |
| Manifest-first progressive import | Verified | `documentManifest.js`, `importScheduler.js`, `importCoordinator.js` |
| Progressive PDF processing wired into app | Verified | `useDocumentImport` routes PDFs through `progressivePdfImport`; first-ready is internal only |
| Terminal import policy | Verified | Progress starts at `5`, is monotonic and capped at `99` during work, reports `100`, then the app opens the reader |
| 420-page browser probe | Verified | `390px` zero overflow, `2` mounted sections against a `<= 12` assertion, progress `5 -> 100`, reader afterward, `3.7s` probe (2026-09-25). The PDF is generated in-spec with `pdf-lib`, not from the fixture corpus |
| Progressive EPUB/TXT/Markdown path | Partial | Coordinators are exposed; `handleFile` currently uses blocking `parseDocument` |
| Unit lifecycle and priority | Verified | `UNSEEN` to `READY`, `CURRENT` to `BACKGROUND` |
| Bounded concurrency | Verified | 1 mobile, 2 to 3 desktop by hardware concurrency |
| Cancellation | Verified | Per-unit `AbortController`, `cancelStale` on jump |
| Native PDF text fast path | Verified | Pages above the word threshold skip OCR |
| Damaged PDF tolerance | Partial | Tolerant local parsing and local OCR; backend scan remains explicit, and the new empty-password unlock path lacks regression coverage |
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
| Provider chain | Verified | Inside an explicitly started backend job: PaddleOCR preferred, Hugging Face vision fallback |
| Retry and cold-start recovery | Verified | 3 attempts |
| Partial failure reporting | Verified | Failed pages returned and surfaced |
| Stale job pruning | Verified | TTL based cleanup |
| Document and reader endpoints | Verified | Parse, validate, segment, reading-time, notes export/import, and health all respond. The router prefix regression was restored with route-contract tests. See [[Backend Endpoints]]. |
| Backend upload ceiling | Verified | 50 MB in `backend/main.py` and `backend/app/core/config.py` |

## Behavioral layer

| Capability | Status | Evidence |
| --- | --- | --- |
| Reward capsules | Partial | Opt-in, default `false`; copy and chapter-completion trigger still need product validation |
| 4-minute drop-off detection | Verified | 240000 ms stillness check |
| Intervention modal | Verified | Opt-in, default `false` |
| Social resonance | Partial | Backend mock resonance and session-pulse routes exist; no persistent social product or frontend experience |
| Haptic feedback vocabulary | Verified | `triggerHaptic`, `HAPTIC_PATTERNS` in `src/shared/lib/haptics.js`, used by `FocusCard.jsx` and `SelectionTooltip.jsx` |
| Paragraph classification heuristic | Verified | `classifyParagraph` in `src/shared/lib/text.js`, 7 categories, unit tested in `text.test.js` |

## Reliability and quality

| Capability | Status | Evidence |
| --- | --- | --- |
| Error boundaries | Verified | Subtree and root isolation with reset |
| Safe storage fallback | Verified | `getSafeStorage()` with in-memory fallback |
| Code splitting | Verified | Vendor chunks plus lazy modals and parsers |
| Reduced motion support | Verified | Respected across the reader |
| Frontend unit tests | Verified | 52 test files, 506 passing tests, 9.82s (`npm test`, 2026-10-02). No DOM environment is installed; see [[Testing Pipeline]] |
| Lint | Verified | 0 errors, 1 `react-refresh/only-export-components` warning at `src/features/reader/components/CommandPalette.jsx:12` (2026-10-02) |
| Playwright browser tests | Verified | 19 tests in 4 specs: 14 lens bar, 2 smoke, 2 Reading Lens responsive, 1 long-import. The 420-page probe is recorded as `3.7s` (2026-09-25) |
| Build | Verified | Built in 2.37s on this machine; warns on chunks over 500 kB and on an `INEFFECTIVE_DYNAMIC_IMPORT` for `FocusCard.jsx` (2026-10-02) |
| Contrast gate | Verified | `node scripts/security/contrast.mjs` PASS, 63 pairs checked, 11 skipped as token-absent. Manual step, not an npm script |
| Vault gate | Verified | `npm run check:vault` PASS, 0 problems (2026-10-02) |
| Backend test suite | Verified | 75 passing tests with 1 Starlette deprecation warning (`pytest backend/tests/`, 2026-10-02) |
| Pyright type checking | Verified | 0 errors; 2 pre-existing missing-source warnings (2026-09-25) |
| CI coverage | Partial | `.github/workflows/webpack.yml` runs lint, test, build on Node 20/22 and pytest on Python 3.11/3.12. It does not run e2e, `check:vault`, the contrast script, or pyright |
| Performance marks | Verified | 7 named `bookflow:` marks plus measure helpers; no published p50/p95 aggregator |

## Gaps, stated plainly

| Gap | Impact |
| --- | --- |
| Partial return loop | Metadata library, stats, goals, achievements, session recap, and `RecentShelf` exist; file-handle reuse and automatic reopen without re-selection remain open |
| No durable large-document storage | Adapter exists, but document persistence is not wired into the app lifecycle |
| No cross-device annotation portability | Per-document notes and bookmarks do export as a paginated PDF via `notesPdfExport.js`, but there is no versioned round-trippable annotation bundle, so notes are still confined to one browser profile |
| Paragraph id anchoring is fragile | Reordered re-parse can orphan annotations |
| No multi-column layout sorting | Two-column PDFs can interleave |
| English-only bundled OCR | Other languages unsupported locally |
| Not PWA-ready | No manifest, service worker, or offline install |
| No native wrappers | Web-polished only |
| Import speed baseline partial | One 420-page browser probe is measured; p50/p95 by format and device are not published |
| Resume without re-selection | Current `ResumeCard` requires the reader to choose the source file again |
| Lens remote provider | SSE contract, consent, bounds, and fallback are tested; live provider quota, multi-user auth, and per-process rate limiting remain open |
| Large Lens bundle | `pdf-lib` and Three.js remain in large chunks (`vendor-three` 736.73 kB, main `index` 667.35 kB, `pdf` 329.86 kB, 2026-10-02); a strict bundle budget is not enforced, and CI does not build-and-gate on size |

Detail: [[Backlog P0-P1-P2]], [[Success Metrics]], [[Competitor Analysis]].

## How to update this note

```text
1  Change the status only when code and runtime have been verified
2  Add the evidence column entry (file, constant, or command result)
3  Update the updated field in frontmatter
4  Follow [[Context Sync Protocol]] for the notes that reference the changed row
```
