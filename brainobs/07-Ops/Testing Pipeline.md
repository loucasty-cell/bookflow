---
title: Testing Pipeline
type: guide
status: verified
updated: 2026-10-02
tags: [bookflow, ops, testing, quality, verification]
source-files: [package.json,playwright.config.js,vitest.config.js,scripts/check-vault.mjs,scripts/security/contrast.mjs,tests/e2e/smoke.spec.js,tests/e2e/long-import.spec.js,tests/e2e/reading-lens.spec.js,tests/e2e/lens-bar.spec.js,tests/fixtures/generate-fixtures.mjs,backend/tests,AGENTS.md]
---

# Testing Pipeline

Every check, what it covers, and when it is required. Counts in this note were
re-measured on 2026-10-02; re-run before relying on them.

## The gate set

```bash
npm run lint                            # ESLint
npm test                                # Vitest, node environment
npm run build                           # Production bundle
npm run check:vault                     # brainobs vault integrity
pytest backend/tests/ -v                # Backend suite
$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e
```

One gate is **not** wired to an npm script and must be run by hand:

```bash
node scripts/security/contrast.mjs
```

Measured baseline on 2026-10-02:

| Gate | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | 0 errors, 1 warning at `src/features/reader/components/CommandPalette.jsx:12` (`react-refresh/only-export-components`) |
| Unit | `npm test` | 52 test files, 506 tests, all passing, 9.82s |
| Build | `npm run build` | Built in 2.37s; warns on chunks over 500 kB and on one `INEFFECTIVE_DYNAMIC_IMPORT` for `FocusCard.jsx` |
| Vault | `npm run check:vault` | PASS, 0 problems |
| Contrast | `node scripts/security/contrast.mjs` | PASS, 63 token pairs checked, 11 skipped as token-absent |
| Backend | `pytest backend/tests/ -v` | 75 passed, 1 Starlette deprecation warning |
| Browser | `npx playwright test --list` | 19 tests in 4 spec files |

## The frontend suite has no DOM

This is the single most important constraint for anyone writing a test here.
There is **no jsdom, no happy-dom, and no Testing Library** in `package.json`,
and `vitest.config.js` sets no `environment`, so every Vitest file runs in the
`node` environment with no `document`, no `window`, and no layout engine.

That forces two established patterns:

| What you are testing | Pattern | Example |
| --- | --- | --- |
| Component markup | `renderToStaticMarkup` from `react-dom/server`, then assert on the returned HTML string | `src/features/reader/components/CommandPalette.test.jsx` |
| Hook logic | Hand-rolled harness that calls the hook directly, with `vi.mock('react')` replacing `useState` and `useCallback` | `src/features/reader/hooks/useReaderAnnotations.test.js` |

The `react` mock collapses hooks to their simplest behaviour, so a hook test
can call the hook as a plain function and inspect the values it returns:

```js
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useCallback: (callback) => callback,
    useState: (initialValue) => [initialValue, vi.fn()],
  }
})
```

Consequences to accept rather than fight:

- No `fireEvent`, no `userEvent`, no `getByRole`, no `waitFor`. Interaction is
  tested by calling the exported handler and asserting on its arguments.
- No reflow, no `getBoundingClientRect`, no computed styles in a unit test.
  Anything that needs real layout belongs in a Playwright spec.
- The eight `.test.jsx` files that exist today are all
  `renderToStaticMarkup` string assertions, not DOM tests.

Adding jsdom or Testing Library is a dependency change and needs explicit
approval, per the repository rules.

## Vitest coverage areas

| Area | Examples |
| --- | --- |
| Text formatting | `getFixationLength` boundaries, `formatParagraphText` |
| Reading controller | Rail ratio, scroll intent, progress |
| Focus rail | Equivalence fuzzing plus the cost benchmark |
| Focus eligibility | Which chapters participate in focus |
| Viewport helpers | Safe viewport and alignment maths |
| Storage | Safe storage fallback and key construction |
| Parsers | Format-specific structure rules |
| Manifest and scheduler | Unit lifecycle, priority, concurrency |
| Display formatting | Reading time and label output |
| Library | Metadata normalization, caps, session totals, reading speed, recent shelf, resume card |
| Durable adapter | OPFS/IndexedDB fallback |
| Long-book and reader helpers | Chapter windowing, dictionary, static-region alignment |
| Reading Lens | Selection-only context, explicit consent, SSE parsing, abort/stale requests, provider fallback, chapter opt-in |
| Lens bar | Consent choices, request building, position clamping, store, theme detection, plain-text coercion |
| Notes | Long-note pagination, non-WinAnsi glyph handling, filename and download behaviour, search filtering |
| Graphics quality | Device-tier resolution |
| Command palette | Command filtering and open/close rendering |
| Widgets | Spec assembly and motion tokens |
| Motion presets | Shared Framer Motion presets |

## Playwright browser coverage

19 tests across four specs, as listed by `npx playwright test --list`:

| Spec | Tests | What it covers |
| --- | --- | --- |
| `tests/e2e/smoke.spec.js` | 2 | Landing loads with no fatal console errors; narrow viewport has no horizontal overflow |
| `tests/e2e/long-import.spec.js` | 1 | 420-page synthetic PDF reaches 100 percent before the reader mounts, progress is monotonic, no horizontal overflow, at most 12 mounted `.reading-section` nodes |
| `tests/e2e/reading-lens.spec.js` | 2 | Selection Lens stays usable at 320px and 390px |
| `tests/e2e/lens-bar.spec.js` | 14 | Lens bar open/collapse, grip, capped input, consent choices, mode menu, Escape, keyboard movement with persisted position, overflow at 320/390/430px, reduced motion, theme attribute resolution, hostile-markup escaping |

`tests/e2e/lens-bar.spec.js` did not exist before the `feat/lens-bar` merge.

### How the browser tests run

From `playwright.config.js`:

| Setting | Value |
| --- | --- |
| `testDir` | `tests/e2e` |
| `baseURL` | `http://localhost:4175` |
| `timeout` | 60000 |
| `fullyParallel` | `false` |
| `reporter` | `list` |
| `webServer.command` | `npm run preview -- --port 4175 --strictPort` |
| `reuseExistingServer` | `true` |

Two consequences that catch people out:

1. **Tests run against a production preview build, not the dev server.**
   Playwright boots `vite preview` on port 4175. If `dist/` is stale, the browser
   tests silently measure the old build. Run `npm run build` before trusting a
   failure.
2. **`npm run preview` is `vite preview` and takes no test argument.** The script
   is `"preview": "vite preview"`; Playwright supplies `--port 4175
   --strictPort` itself. Do not add a `test` argument to it.

There is no `projects` block, so there are no named projects to select. The
browser binary is chosen by `channel: process.env.PLAYWRIGHT_CHANNEL ||
undefined`, so:

```bash
$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e
```

The bundled Chromium download is unreliable in this environment, which is why
the system Chrome channel is the documented path. With the variable unset, the
default browser is whatever Playwright resolves.

The long-import run on 2026-09-25 observed progress `5 → 100`, mounted the reader
only after `100`, measured `0` horizontal overflow at `390 x 844`, mounted `2`
reading sections, and completed in `3,847 ms`. A separate run recorded
`5,774 ms`. This is a single probe, not a p50/p95 benchmark.

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

`conftest.py` provides the test client and sample image fixtures. The single
warning is a Starlette deprecation for `HTTP_422_UNPROCESSABLE_ENTITY`.

Pyright is expected to stay at zero errors, targeting `backend/.venv` via
`pyrightconfig.json`, with 2 pre-existing missing-source warnings.

## What CI does and does not run

`.github/workflows/webpack.yml`, job name `CI checks`, on push to `main` and on
pull requests to `main`:

| Job | Matrix | Steps |
| --- | --- | --- |
| `frontend` | Node 20.x, 22.x | `npm ci`, `npm run lint`, `npm test`, `npm run build` |
| `backend` | Python 3.11, 3.12 | `pip install -r backend/requirements.txt`, then `pytest backend/tests/ -v` |

CI does **not** run `npm run test:e2e`, `npm run check:vault`,
`node scripts/security/contrast.mjs`, or `npx pyright`. A green badge means
lint, unit, build, and backend tests passed and nothing more.

A second workflow, `.github/workflows/python-publish.yml`, runs on `release`
with `types: [published]`.

## Always run

```bash
npm run lint
npm test
npm run build
npm run check:vault
node scripts/security/contrast.mjs
pytest backend/tests/
git diff --check
```

`git diff --check` catches whitespace errors and conflict markers before they
reach a commit.

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

Regenerate with `node tests/fixtures/generate-fixtures.mjs`. `sample-long.pdf` is 25 pages. The
420-page probe in `tests/e2e/long-import.spec.js` builds its document in-spec with `pdf-lib`
instead of using the fixture. `pdf-lib` generates fixtures only and is never bundled from `src/`.

## Quality standards

| Rule | Reason |
| --- | --- |
| Add focused tests for new logic | Parsing, validation, controllers, storage, formatting |
| Test beside the file as `*.test.js` or `*.test.jsx` | Discovery and locality; `vitest.config.js` includes `src/**/*.test.{js,jsx}` |
| Use `renderToStaticMarkup` for components | No DOM environment is installed |
| Mock `react` for hook logic tests | Hooks cannot run in a plain node environment |
| Backend tests in `backend/tests/test_*.py` | Consistent with existing layout |
| Property test pure functions at boundaries | Fixation length, progress, segmentation |
| Measure before claiming improvement | Report p50 and p95 |
| Fix a lint warning or state why it stays | The baseline is 0 errors and 1 known warning |

## Gaps to close

| Gap | Priority |
| --- | --- |
| No DOM test environment | High; blocks any interaction test without a new dependency |
| End-to-end coverage of real reading flows | High; selection Lens, lens bar, and responsive coverage now pass, but auth and provider-error browser flows remain open |
| Long-book browser coverage | One 420-page terminal-import probe is verified; repeated p50/p95 and scanned-PDF integration remain open |
| Scanned-PDF integration tests | P0 |
| Accessibility checks in key flows | High |
| OCR confidence benchmark corpus | Medium |
| Bundle budget enforcement in CI | Medium; the 2026-10-02 build warns on the 736.73 kB `vendor-three` chunk and the 667.35 kB main chunk, and CI builds without asserting size |
| Browser, vault, contrast, and pyright gates in CI | High; all four are absent from `.github/workflows/webpack.yml` |
| Remote Lens provider browser verification | Medium; unit and backend contract tests pass, but no live provider key is committed or used in tests |

Related: [[Backlog P0-P1-P2]], [[Debugging Playbook]], [[Dev Setup]], [[Invariants]], [[Success Metrics]].
