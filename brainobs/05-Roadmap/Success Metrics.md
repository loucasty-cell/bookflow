---
title: Success Metrics
type: reference
status: living
updated: 2026-09-25
tags: [bookflow, roadmap, metrics, benchmarks]
source-files: [scripts/bench.md, improvements.md, src/shared/lib/perfMarks.js, tests/e2e/smoke.spec.js, tests/e2e/long-import.spec.js, src/features/document-import/hooks/useDocumentImport.js, src/features/reader/hooks/useChapterWindow.js]
---

# Success Metrics

Measurable outcomes, with current baselines and targets. A claim without a number is an opinion.

## Verified baseline

| Metric | Value | Verified |
| --- | --- | --- |
| Vitest test files | 31 | `npm test -- --reporter=dot`, 2026-09-25 |
| Vitest tests | 163 passing | Same run, 2026-09-25 |
| Vitest duration | 5.02s | Same run, machine-dependent |
| Playwright smoke tests | 2 | `tests/e2e/smoke.spec.js`, 2026-09-25 |
| Playwright long-import test | 1 | `tests/e2e/long-import.spec.js`, 2026-09-25 |
| 420-page browser probe | `3,847 ms` (about `3.7 s`) | One run, 2026-09-25 |
| Probe progress | `5 → 100` | Reader appeared after the terminal 100 |
| Probe viewport | `390 x 844`, overflow `0` | One run, 2026-09-25 |
| Probe mounted sections | `2` | One run, 2026-09-25 |
| Backend tests | 45 collected across 8 modules | `pytest backend/tests/ --collect-only -q`, 2026-09-25 |

The prior bundle figures in `scripts/bench.md` are historical. Re-run `npm run lint` and
`npm run build` before publishing new bundle numbers; do not copy an earlier baseline forward.

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
| Mobile layout | No overflow at 390px | Verified in the long-import and smoke probes; 320px remains a separate pass |
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
`getMeasures()` are available helpers, but no p50/p95 benchmark aggregator is published yet.

## Fixture corpus

| Fixture | Format | Purpose |
| --- | --- | --- |
| `sample-native.pdf` | PDF | Two-page text PDF with native text |
| `sample-scanned.pdf` | PDF | One-page image-only scan |
| `sample-twocol.pdf` | PDF | Two-column layout |
| `sample-long.pdf` | PDF | 25-page long-book performance test |
| `sample-reading.txt` | TXT | Plain text book sample |
| `sample-structure.md` | Markdown | Markdown with headings |

Regenerate with `node tests/fixtures/generate-fixtures.mjs`. `pdf-lib` is a dev-only fixture
dependency and is never bundled from `src/`.

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