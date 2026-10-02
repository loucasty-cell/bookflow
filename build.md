# build.md

How to build and verify Bookflow.

This file reconstructs the verification pipeline from the `Required Verification
Pipeline` section of `AGENTS.md`. Every count and signal below was measured on
this repository, not copied from an earlier claim. If a command here disagrees
with what you observe, the command output wins: update this file instead of
trusting it.

---

## Stack

- Frontend: React 19, Vite 8, Zustand, Vitest, ESLint, Playwright.
- Backend: optional. FastAPI under `backend/`, only needed for OCR acceleration.

The app runs entirely on the frontend without the backend. Do not start it
unless you are working on OCR.

---

## Commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` (Vite, port 3000) |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Unit and component tests | `npm test` |
| Type check | `npm run typecheck` |
| Vault integrity | `npm run check:vault` |
| Contrast gate | `node scripts/security/contrast.mjs` |
| Browser tests | `$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e` |
| Backend tests | `pytest backend/tests/` |
| Backend type check | `npx --no-install pyright` |
| Test fixtures | `node tests/fixtures/generate-fixtures.mjs` |

`PLAYWRIGHT_CHANNEL=chrome` is required on this machine. The bundled Chromium
download is unreliable here, so the system Chrome channel is the supported path.

---

## The gate

Run all of these before committing anything that changes source:

```bash
npm run lint
npm test
npm run build
npm run check:vault
node scripts/security/contrast.mjs
$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e
pytest backend/tests/
npx --no-install pyright
```

### Measured baseline

| Check | Result |
|---|---|
| `npm run lint` | 0 errors, 1 warning |
| `npm test` | 55 files, 529 tests passing |
| `npm run build` | succeeds, ~25s |
| `npm run check:vault` | PASS, 0 missing fields, 0 broken wikilinks, 0 orphans |
| `contrast.mjs` | PASS, 63 token pairs |
| `npm run test:e2e` | 19 passing |
| `pytest backend/tests/` | 75 passed |
| `npx --no-install pyright` | 0 errors, 2 warnings |
| `npm audit --omit=dev` | 0 vulnerabilities |

### Expected non-failing signals

These are baseline noise. They are warnings, not regressions, and a change is
not broken because one of them appears.

- `npm run lint` reports one `react-refresh/only-export-components` warning in
  `src/features/reader/components/CommandPalette.jsx`.
- `npm run build` warns that the main chunk and the Three.js chunk exceed
  500 kB, and reports `INEFFECTIVE_DYNAMIC_IMPORT` for `FocusCard.jsx`.
- `npx --no-install pyright` reports exactly 2 warnings, both
  `reportMissingModuleSource` for third-party imports (`defusedxml`,
  `setuptools`). Zero errors is the bar, not zero warnings.
- `pytest backend/tests/` reports one Starlette deprecation warning about
  `HTTP_422_UNPROCESSABLE_ENTITY`. 75 passed is the bar.
- `node scripts/security/contrast.mjs` prints `token absent` notes for the paper
  theme and still passes, because those pairs resolve through inheritance rather
  than a literal token on the theme block.
- Full `npm audit` reports dev-only findings. `npm audit --omit=dev` is clean;
  that is the one that gates a release.

---

## Extra checks for reader, parser, or visual changes

Automated tests do not cover the reading experience. If you touched the reader,
a parser, or anything visual, confirm by hand:

- A representative document imports successfully.
- Sentence focus follows the reading position.
- Bionic reading fixations and typeface selections apply cleanly.
- Notes, bookmarks, and settings persist across a reload.
- Desktop and mobile layouts stay usable with zero horizontal overflow.
- Reading Lens stays local-only until consent is granted, and the card stays
  inside the viewport at `320px`, `390px`, and desktop widths.

Use `tests/fixtures/` for documents. `sample-native.pdf` is a 2-page text PDF,
`sample-scanned.pdf` is image-only and exercises the OCR path,
`sample-long.pdf` is 25 pages for the long-book windowing test, and
`sample-reading.txt` and `sample-structure.md` cover the text paths.

The landing page has a `Read the sample` button that opens the reader with a
built-in document, which is the fastest way into the reader without a fixture.

---

## Design invariants with tests attached

These are not style preferences. Each one has a test that fails when it is
broken, so read the test before changing the value.

| Invariant | Test |
|---|---|
| Spacing, radius, type, z-index and hit-target tokens match their source of truth | `src/design/geometry.test.js` |
| Tailwind imports before `tokens.css`, or it silently overrides the radius scale | `src/design/stylesheet.test.js` |
| `a11y.css` imports last, and declares the forced-colors, prefers-contrast and reduced-transparency fallbacks | `src/design/stylesheet.test.js` |
| No `font-size` at or below 12px anywhere in `src`; use `var(--ui-caption)` | `src/design/typography.test.js` |

`src/design/geometry.ts` is the numeric source of truth for UI geometry.
`src/styles/tokens.css` must declare the matching values, and the agreement test
fails on drift. Do not hand-edit a token in the stylesheet alone.

---

## Commit conventions

Conventional type prefix, then `-` bullets in the body:

```text
refactor: organize the reader by feature

- separate reader panels from application state
- move shared utilities behind public exports
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`.

Never add `Co-Authored-By` or any other co-author trailer. Never add emojis to
code, commits, or development output.