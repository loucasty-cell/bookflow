---
title: Testing Pipeline
type: guide
status: verified
updated: 2026-09-26
tags: [bookflow, ops, testing, quality, verification]
source-files: [package.json, scripts/bench.md, backend/tests, tests/e2e/smoke.spec.js, tests/e2e/long-import.spec.js, playwright.config.js, AGENTS.md]
---

# Testing Pipeline

Every check, what it covers, and when it is required.

## Frontend

```bash
npm run lint      # ESLint
npm test          # Vitest
npm run test:e2e  # 2 smoke tests, 1 long-import, and 2 Reading Lens tests (5 total) plus the 420-page long-import test
npm run build     # Production build
```

Current command baseline measured 2026-09-26 after the 46fe51b repair: Vitest reports 39 test files and 308 passing tests;
`pytest backend/tests/ -q` reports 75 passing tests across the reader, lens, PDF-guard, and existing OCR modules. Re-run the commands
before relying on timings or counts.

### Vitest coverage areas

| Area | Examples |
| --- | --- |
| Text formatting | `getFixationLength` boundaries, `formatParagraphText` |
| Reading controller | Rail ratio, scroll intent, progress |
| Focus eligibility | Which chapters participate in focus |
| Viewport helpers | Safe viewport and alignment maths |
| Storage | Safe storage fallback and key construction |
| Parsers | Format-specific structure rules |
| Manifest and scheduler | Unit lifecycle, priority, concurrency |
| Display formatting | Reading time and label output |
| Library and durable adapter | Metadata normalization, caps, session totals, OPFS/IndexedDB fallback |
| Long-book and reader helpers | Chapter windowing, dictionary, static-region alignment |
| Reading Lens | Selection-only context, explicit consent, SSE parsing, abort/stale requests, provider fallback, chapter opt-in |
| Notes export | Long-note pagination, non-WinAnsi glyph handling, filename and download behavior |
| Lens browser behavior | Selection toolbar handoff, drag clamping, 320px and 390px no-overflow checks |

## Playwright browser coverage

`tests/e2e/smoke.spec.js` contains two smoke tests: landing loads without fatal console errors and
`390 x 844` has no horizontal overflow. `tests/e2e/long-import.spec.js` probes a generated 420-page
selectable-text PDF. `tests/e2e/reading-lens.spec.js` verifies selection handoff, drag clamping, and
zero overflow at `320px` and `390px`.

The measured long-import run on 2026-09-25 after the repair observed progress `5 → 100`, mounted the reader only
after `100`, measured `0` horizontal overflow at `390 x 844`, mounted `2` reading sections, and
completed in `5,774 ms on a separate run, against 3,847 ms in [[Success Metrics]]`. This is a single probe, not a p50/p95 benchmark.

## Backend

```bash
pytest backend/tests/ -v
npx pyright
```

### Pytest modules

| Module | Covers |
| --- | --- |
| `test_health` | Health and info endpoints |
| `test_text` | Segmentation, word count, reading time |
| `test_documents` | Document parsing |
| `test_ocr` | OCR service and mocked provider inference |
| `test_ocr_worker` | Worker behaviour |
| `test_accelerated_ocr` | Accelerated scan path |
| `test_reader` | Reader utilities and route contracts |
| `test_reading_lens` | Consent, bounds, SSE, provider fallback, and error redaction |
| `test_document_pdf_guards` | Encrypted PDF and zero-text rejection guards |
| `test_config` | Configuration loading |

`conftest.py` provides the test client and sample image fixtures.

Pyright is expected to stay at zero errors, targeting `backend/.venv` via `pyrightconfig.json`.

## Always run

```bash
npm run lint
npm test
npm run test:e2e
npm run build
pytest backend/tests/
git diff --check
```

`git diff --check` catches whitespace errors and conflict markers before they reach a commit.

When vault notes were edited:

```bash
npm run check:vault
```

Detail: [[Context Sync Protocol]], [[Vault Maintenance]].

## Browser verification for reader, parser, or visual work

Required passes:

- [ ] Landing and sample-book entry.
- [ ] A representative imported document.
- [ ] A controlled scanned PDF with no selectable text, confirming recognized page order against the source image.
- [ ] One malformed, empty, oversized, or unsupported file.
- [ ] The focus model with wheel, keyboard, and touch-equivalent input.
- [ ] Notes, bookmarks, settings, progress restoration, and error states touched by the change.
- [ ] Desktop and a `390 x 844` viewport with no overflow.
- [ ] Measured `44 x 44` minimum targets on visible mobile controls.
- [ ] Long book and chapter titles.
- [ ] Every changed theme, including near-black values.
- [ ] The loading state reaching a visible 100 percent before the reader surface changes.
- [ ] Loaded logo assets and a console with no warnings or errors.

Use computed styles and measured dimensions as evidence, not screenshots alone.

Detail: [[Verification Checklist]].

## Test corpus

Fixtures: `sample-native.pdf`, `sample-scanned.pdf`, `sample-twocol.pdf`, `sample-long.pdf`,
`sample-reading.txt`, `sample-structure.md`.

Regenerate with `node tests/fixtures/generate-fixtures.mjs`. `pdf-lib` generates fixtures only and
is never bundled from `src/`.

## Quality standards

| Rule | Reason |
| --- | --- |
| Add focused tests for new logic | Parsing, validation, controllers, storage, formatting |
| Test beside the file as `*.test.js` | Discovery and locality |
| Backend tests in `backend/tests/test_*.py` | Consistent with existing layout |
| Property test pure functions at boundaries | Fixation length, progress, segmentation |
| Measure before claiming improvement | Report p50 and p95 |

Detail: [[Success Metrics]], [[File Placement Map]].

## Gaps to close

| Gap | Priority |
| --- | --- |
| End-to-end coverage of real reading flows | High; selection Lens drag and responsive coverage now pass, but auth and provider-error browser flows remain open |
| Long-book browser coverage | One 420-page terminal-import probe is verified; repeated p50/p95 and scanned-PDF integration remain open |
| Scanned-PDF integration tests | P0 |
| Accessibility checks in key flows | High |
| OCR confidence benchmark corpus | Medium |
| Bundle budget enforcement in CI | Medium; current build warns on the 645.8 kB main chunk and 516.1 kB Three.js chunk (rebuilt 2026-09-26) |
| Remote Lens provider browser verification | Medium; unit and backend contract tests pass, but no live provider key is committed or used in tests |

Related: [[Backlog P0-P1-P2]], [[Debugging Playbook]], [[Invariants]].
