# Bookflow Baseline Benchmark

**Date:** 2026-09-15
**Environment:** Windows, Node v?, npm v?, Vite 8.2.2

---

## Test Suite Baseline

| Metric | Value |
|---|---|
| Vitest test files | 15 |
| Vitest tests | 64 |
| Test duration | ~2.3s |
| ESLint errors | 0 |
| Production build | Pass (9.66s) |
| Initial JS bundle (main) | 101.61 kB gzip: 33.02 kB |
| pdf chunk | 329.86 kB gzip: 97.02 kB |
| three.js chunk | 528.46 kB gzip: 131.44 kB |
| react chunk | 173.97 kB gzip: 55.40 kB |
| motion chunk | 127.49 kB gzip: 41.66 kB |

---

## Performance Marks Added

Marks fire at these pipeline points:

```
bookflow:import-selected       — file selected, before validation
bookflow:validation-done       — file type confirmed
bookflow:native-text-done      — PDF native text extraction complete
bookflow:ocr-start             — local Tesseract OCR begins
bookflow:ocr-done              — local Tesseract OCR ends
bookflow:chapters-done         — chapters assembled
bookflow:reader-mounted        — first render after openBook()
```

Read via `performance.getEntriesByType('measure')` filtered by `bookflow:` prefix.

---

## Fixture Inventory

| Fixture | Format | Purpose | Size |
|---|---|---|---|
| sample-native.pdf | PDF | 2-page text PDF, native text | 1.6 kB |
| sample-scanned.pdf | PDF | 1-page image-only scan | 0.9 kB |
| sample-twocol.pdf | PDF | Two-column layout | 1.4 kB |
| sample-long.pdf | PDF | 25-page long-book perf test | 11.5 kB |
| sample-reading.txt | TXT | Plain text book sample | 3.3 kB |
| sample-structure.md | Markdown | Markdown with headings | 2.1 kB |

Regenerate PDFs: `node tests/fixtures/generate-fixtures.mjs`

Note: `pdf-lib` is a dev-only fixture generator dependency (`tests/fixtures/generate-fixtures.mjs`).
It is never imported from `src/`, so Vite does not bundle it into the production build.

---

## Target Budgets (Week 1 targets)

| Metric | Target | Status |
|---|---|---|
| Time to visible import UI | < 1s after file selection | TODO: measure |
| Time to first native-text unit | < 2s for representative PDF | TODO: measure |
| Time to first OCR unit | Show progress immediately; < 5s target | TODO: measure |
| UI long task during OCR | No task > 100ms | TODO: measure |
| OCR active jobs | 1-3 by device class | Implemented: min(3, hw/2) desktop, 1 mobile |
| Reader DOM | Virtualize when paragraph count large | TODO: Week 6 |
| Mobile layout | No overflow at 320px | TODO: E2E check |
| Memory | Bounded growth during long-book | TODO: measure |

---

## Manifest-First Import (New)

Status: **Implemented** (documentManifest.js, importScheduler.js, importCoordinator.js)

- Per-unit lifecycle: `UNSEEN -> QUEUED -> PROCESSING -> READY | FAILED | CANCELLED`
- Priority: `CURRENT(0) > NEXT(1) > PREVIOUS(2) > BACKGROUND(3)`
- Concurrency: 1 mobile, 2-3 desktop (measured via `navigator.hardwareConcurrency`)
- Cancellation: AbortController per unit, `cancelStale()` on user jump
- Progressive: first unit signals reader open, background continues

Not yet wired into App.jsx — requires Task 3 decomposition to replace blocking `parseDocument` with progressive coordinator.

Update 2026-09-15: WIRED. `handleFile` routes PDFs through `progressivePdfImport` by default
(`settings.useProgressiveImport !== false`), opens the first ready unit immediately, streams
remaining units into the reader in source-page order, and falls back to blocking `parseDocument`
on progressive failure. `jumpToChapter` notifies the scheduler via `jumpToUnit`; closing or
re-importing cancels the active import. Capsules and return reminders are opt-in
(`showRewardCapsules` / `showInterventionModals`, both default false).
