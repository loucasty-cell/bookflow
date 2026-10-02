---
title: Success Metrics
type: reference
status: living
updated: 2026-10-02
tags: [bookflow, roadmap, metrics, benchmarks]
source-files: [scripts/bench.md,improvements.md,src/shared/lib/perfMarks.js,tests/e2e/smoke.spec.js,tests/e2e/long-import.spec.js,tests/e2e/lens-bar.spec.js,playwright.config.js,vitest.config.js,package.json,src/features/document-import/hooks/useDocumentImport.js,src/features/reader/hooks/useChapterWindow.js]
---

# Success Metrics

Measurable outcomes, with current baselines and targets. A claim without a number is an opinion.

## Verified baseline

Every row below was re-measured in one session on 2026-10-02 unless the row says otherwise.

| Metric | Value | Verified by |
| --- | --- | --- |
| Vitest test files | 52 | `npm test` |
| Vitest tests | 506 passing | `npm test` |
| Vitest duration | 9.82s | same run, machine-dependent |
| ESLint | 0 errors, 1 warning | `npm run lint`; warning is `react-refresh/only-export-components` at `src/features/reader/components/CommandPalette.jsx:12` |
| Playwright tests | 19 in 4 spec files | `npx playwright test --list` |
| Playwright spec split | 14 lens bar, 2 smoke, 2 Reading Lens, 1 long-import | same listing |
| Playwright base URL and port | `http://localhost:4175` | `playwright.config.js` |
| Playwright timeout | 60000 ms, `fullyParallel: false` | `playwright.config.js` |
| Production build | built in 2.37s | `npm run build`, machine-dependent |
| Build warnings | chunks over 500 kB, plus one `INEFFECTIVE_DYNAMIC_IMPORT` for `FocusCard.jsx` | `npm run build` |
| Largest chunks | `vendor-three` 736.73 kB, main `index` 667.35 kB, `pdf` 329.86 kB | `npm run build` |
| Contrast gate | 63 pairs checked, 11 skipped as token-absent, PASS | `node scripts/security/contrast.mjs` |
| Vault gate | PASS, 0 problems | `npm run check:vault` |
| Backend tests | 75 passed, 1 Starlette deprecation warning | `pytest backend/tests/ -q` |
| 420-page browser probe | `3,847 ms` (about `3.7 s`) | One run, 2026-09-25 |
| Probe progress | `5 → 100` | Reader appeared after the terminal 100 |
| Probe viewport | `390 x 844`, overflow `0` | One run, 2026-09-25 |
| Probe mounted sections | `2`, against a `<= 12` assertion | One run, 2026-09-25 |

Two cautions on this table. First, `sample-long.pdf` is a 25-page fixture; the 420-page probe
generates its document in-spec with `pdf-lib` and is not the same input. Second, the earlier
bundle figures in `scripts/bench.md` are historical, and so are the previously recorded Vitest
counts of 39 files and 308 tests. Re-run the commands before publishing new numbers; do not copy
an earlier baseline forward.

`npm run preview` is `vite preview` and takes no test argument. Playwright passes
`--port 4175 --strictPort` to it, and `channel` comes from `process.env.PLAYWRIGHT_CHANNEL`, so
`$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e` selects the system Chrome channel. There is
no `projects` block, so no named projects exist to select from.

## Performance targets

| Metric | Target | Status |
| --- | --- | --- |
| Time to visible import UI | Under 1s after selection | To measure |
| Terminal PDF import to reader | Visible monotonic 100% before open | Verified in the 420-page probe |
| Time to first native-text unit | Under 2s for a representative PDF | To measure; reader does not open before terminal completion |
| Time to first OCR unit | Progress shown immediately, under 5s | To measure |
| Long task during OCR | None over 100ms | To measure |
| Active OCR jobs | 1 to 3 by device class | Implemented: `min(3, hw/2)` desktop, 1 mobile |
| Reader DOM | Bound long-book chapter window | Implemented above 1,500 paragraphs; spacer heights measured in browser |
| Mobile layout | No overflow at 320px, 390px, and 430px | Verified in the long-import, smoke, Reading Lens, and lens-bar browser specs |
| Memory | Bounded growth on a long book | To measure |

## Performance marks

Seven named marks fire at these pipeline points:

```text
bookflow:import-selected       file selected, before validation
bookflow:validation-done       file type confirmed
bookflow:native-text-done      PDF native text extraction complete
bookflow:ocr-start             local Tesseract OCR begins
bookflow:ocr-done              local Tesseract OCR ends
bookflow:chapters-done         chapters assembled
bookflow:reader-mounted        first render after terminal import and openBook()
```

Read marks with `getMarks()` or `performance.getEntriesByType('mark')`. `measure()` and
`getMeasures()` are available helpers, but no p50/p95 benchmark aggregator is published yet. Note
that the `bookflow:` prefix is also used for localStorage keys such as `bookflow:library` and
`bookflow:lens-bar`; filter on `performance` entries, not on a string search of the source tree.

## Fixture corpus

| Fixture | Format | Purpose |
| --- | --- | --- |
| `sample-native.pdf` | PDF | Two-page text PDF with native text |
| `sample-scanned.pdf` | PDF | One-page image-only scan |
| `sample-twocol.pdf` | PDF | Two-column layout |
| `sample-long.pdf` | PDF | 25-page long-book performance test |
| `sample-reading.txt` | TXT | Plain text book sample |
| `sample-structure.md` | Markdown | Markdown with headings |

Regenerate with `node tests/fixtures/generate-fixtures.mjs`. `pdf-lib` lives in `dependencies`
(it moved out of `devDependencies` on 2026-09-25); it is reached by the fixture generator and by
the in-spec 420-page PDF in `tests/e2e/long-import.spec.js`, and is not imported from the reader
surface.

## Product metrics to publish

Report baseline and post-work values rather than subjective claims:

| Metric | Why it matters |
| --- | --- |
| Supported-fixture import success rate | Reliability across formats |
| Median and p95 terminal-import-to-reader time by format | The current speed promise after the terminal-100 policy |
| Median and p95 scanned-page OCR time | The hardest path |
| Maximum observed active OCR jobs | Concurrency safety |
| Long-book peak-memory trend | Stability on real textbooks |
| End-to-end pass rate and flaky-test count | Quality gate health |
| Accessibility violations in key flows | Barriers to real readers |
| Annotation persistence success rate | Trust in notes and bookmarks |
| Task completion rate from usability sessions | Whether it actually works for people |
| P0 and P1 defects found before release | Escape rate |

## Habit metrics

These measure whether the psychological design works. They are the honest test.

| Metric | Definition |
| --- | --- |
| Time to first paragraph | Landing to first paragraph read |
| Second-session rate | Share of sessions followed by another within 7 days |
| Session length | Median minutes of active reading |
| Book completion rate | Median share of a book read |
| Annotation rate | Share of sessions ending with a note or bookmark |
| Return without reminder | Return rate with no notification sent |

The last one matters most. If people return only when prompted, the habit is not formed.

Detail: [[Atomic Habits Framework]], [[Habit Loop Design]].

## Measurement rules

- Measure before claiming improvement.
- Report p50 and p95, never only averages.
- Never inflate progress or engagement numbers.
- Never claim comprehension, eye strain, or addiction outcomes without a study.

Detail: [[Ethical Guardrails]], [[Retention Research]], [[Testing Pipeline]].
