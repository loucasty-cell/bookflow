---
title: Success Metrics
type: reference
status: living
updated: 2026-09-18
tags: [bookflow, roadmap, metrics, benchmarks]
source-files: [scripts/bench.md, improvements.md, src/shared/lib/perfMarks.js]
---

# Success Metrics

Measurable outcomes, with current baselines and targets. A claim without a number is an opinion.

## Verified baseline

| Metric | Value | Verified |
| --- | --- | --- |
| Vitest test files | 15 | Re-run confirmed |
| Vitest tests | 64 | All passing |
| Test duration | about 3.3s | Re-run confirmed |
| ESLint errors | 0 | Exit code 0, no output |
| Production build | Pass, 9.41s | Re-run confirmed |
| Main bundle | 120.38 kB, 38.60 kB gzip | Build output |
| PDF chunk | 329.86 kB, 97.02 kB gzip | Build output |
| Three.js chunk | 528.46 kB, 131.44 kB gzip | Build output |
| React chunk | 173.97 kB, 55.40 kB gzip | Build output |
| Motion chunk | 127.49 kB, 41.66 kB gzip | Build output |
| JSZip chunk | 95.82 kB, 28.43 kB gzip | Build output |
| Icon chunk | 15.46 kB, 5.82 kB gzip | Build output |

Note: the baseline in `scripts/bench.md` records the main bundle at 101.61 kB. The re-run above
shows 120.38 kB, so treat the larger figure as current and the bench note as the earlier
baseline. Vite also warns that the Three.js chunk exceeds 500 kB, which is expected for that
dependency and is isolated in its own chunk.

## Performance targets

| Metric | Target | Status |
| --- | --- | --- |
| Time to visible import UI | Under 1s after selection | To measure |
| Time to first native-text unit | Under 2s for a representative PDF | To measure |
| Time to first OCR unit | Progress shown immediately, under 5s | To measure |
| Long task during OCR | None over 100ms | To measure |
| Active OCR jobs | 1 to 3 by device class | Implemented: `min(3, hw/2)` desktop, 1 mobile |
| Reader DOM | Virtualize when paragraph count is large | Deferred |
| Mobile layout | No overflow at 320px | To verify end to end |
| Memory | Bounded growth on a long book | To measure |

## Performance marks

Fire at these pipeline points:

```text
bookflow:import-selected       file selected, before validation
bookflow:validation-done       file type confirmed
bookflow:native-text-done      PDF native text extraction complete
bookflow:ocr-start             local Tesseract OCR begins
bookflow:ocr-done              local Tesseract OCR ends
bookflow:chapters-done         chapters assembled
bookflow:reader-mounted        first render after openBook()
```

Read them with:

```js
performance.getEntriesByType('measure').filter((m) => m.name.startsWith('bookflow:'))
```

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
| Median and p95 time to first readable unit | The core speed promise |
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