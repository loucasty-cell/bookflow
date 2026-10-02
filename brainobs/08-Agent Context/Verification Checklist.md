---
title: Verification Checklist
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, agent, verification, checklist]
source-files: [package.json, AGENTS.md, playwright.config.js, scripts/check-vault.mjs, scripts/security/contrast.mjs, .github/workflows/webpack.yml, backend/tests/conftest.py, backend/Dockerfile, backend/main.py, backend/app/main.py, vite.config.js]
---

# Verification Checklist

What to run and inspect before declaring a change complete. Scale the depth to the risk.

## The real gate set

There is no `format` script and Prettier is not a dependency, so `.prettierignore` is inert.
There is no `typecheck` script. The gates that exist:

```bash
npm run lint                       # eslint .            0 errors expected
npm test                           # vitest run
npm run build                      # vite build (prebuild runs scripts/copy-assets.js)
npm run check:vault                # node scripts/check-vault.mjs
npm run test:e2e                   # playwright test
node scripts/security/contrast.mjs # WCAG gate, NOT wired to npm
pytest backend/tests/ -v           # backend suite
```

`node scripts/security/contrast.mjs` is a real gate that no npm script exposes. It reads
`src/styles/tokens.css`, `src/styles/themes.css`, and `src/styles/themes-overrides.css`, and
enforces a body-text threshold of `4.5` and a large-text threshold of `3.0`. Run it whenever you
touch a token value or a theme.

## Windows Playwright invocation

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e
```

Setting the channel is the reliable path on Windows; the bundled Chromium download is
unreliable in this environment. `playwright.config.js` reads
`channel: process.env.PLAYWRIGHT_CHANNEL || undefined`, so the variable is the only lever.

Two consequences of the config that surprise people:

- **Tests run against a production preview build, not the dev server.** The config starts
  `npm run preview -- --port 4175 --strictPort` and `baseURL` is `http://localhost:4175`.
  Forgetting `npm run build` means you test the previous `dist/`.
- `preview` takes no test argument of its own. The `-- --port 4175 --strictPort` passthrough
  belongs to the config's `webServer` block, not to the preview script.

Other measured config values: `testDir: tests/e2e`, `timeout: 60000`,
`fullyParallel: false`, `reporter: 'list'`, `reuseExistingServer: true`, and **no `projects`
block**.

The e2e suite is 19 tests in 4 spec files: `smoke.spec.js` (2), `long-import.spec.js` (1),
`reading-lens.spec.js` (2), `lens-bar.spec.js` (14). Fixtures live in `tests/fixtures/`:
`generate-fixtures.mjs`, `sample-long.pdf`, `sample-native.pdf`, `sample-reading.txt`,
`sample-scanned.pdf`, `sample-structure.md`, `sample-twocol.pdf`.

## Which backend app each gate exercises

`backend/` contains **two** FastAPI apps. This is the single most misleading fact about
backend verification.

| App | Lines | Exercised by |
| --- | --- | --- |
| `backend/main.py` | 613 | The served app. `backend/Dockerfile` runs `CMD ["uvicorn", "main:app", ...]` |
| `backend/app/main.py` | 82 | The test suite. `backend/tests/conftest.py:8` does `from app.main import app` |

So `pytest backend/tests/` tests `backend/app/main.py`'s app. A route or behaviour that exists
only in `backend/main.py` is **not** covered by the backend suite, and a route added only to
`backend/app/main.py` is **not** served in Docker. When you add a backend route, add it to the
app the user actually runs, and add the test against the app `conftest.py` imports.

## No DOM test environment

The frontend suite has no jsdom, no happy-dom, and no `@testing-library`. Do not write a test
that assumes a DOM.

- Component assertions use `renderToStaticMarkup` from `react-dom/server`.
- Hook tests use a hand-rolled harness that `vi.mock('react')`.
- Store and pure-module tests run directly.

## Reader and visual changes

Use a real browser and check:

- [ ] A representative document imports successfully.
- [ ] Sentence focus follows the reading position.
- [ ] Pin works via click, focused-paragraph `Enter`/`Space`, and `Escape`. Resume restores auto-focus.
- [ ] Step controls advance and reset pin state.
- [ ] Static regions scroll without snapping and show the reading label.
- [ ] Notes, bookmarks, and settings persist across reloads.
- [ ] Progress restoration returns to the exact position.
- [ ] Desktop and mobile layouts stay usable with zero horizontal overflow at 320px and 390px.
- [ ] Long book and chapter titles wrap rather than overflow.
- [ ] Every changed theme renders correct token values, including near-black.
- [ ] Loading reaches a visible 100 percent before the reader surface mounts.
- [ ] Logo assets load and the console shows no warnings or errors.

Use computed styles and measured dimensions as evidence. A screenshot alone is weak proof of
geometry.

Detail: [[Reader Engine MOC]], [[Responsive Breakpoints]], [[Testing Pipeline]].

## Parser changes

- [ ] A representative file of the affected format imports.
- [ ] Chapter and paragraph order matches the source.
- [ ] No empty paragraphs or dropped content.
- [ ] Unusual structure is preserved as readable text, not discarded.
- [ ] One malformed file produces a clear error.

Detail: [[Validation Rules]], [[Normalized Book Contract]].

## Reading Lens changes

- [ ] With no selection, no network request is made.
- [ ] The panel stays local until the reader grants consent.
- [ ] The backend returns `403` without consent and never reaches the provider key.
- [ ] The passage bound is enforced.
- [ ] No provider key appears anywhere in the browser bundle.
- [ ] The card stays inside the viewport at 320px, 390px, and desktop widths.

Detail: [[Reading Lens]], [[Reading Lens Bar]], [[Invariants]].

## OCR changes

- [ ] A controlled scanned PDF imports, and recognized page order matches the source images.
- [ ] Pages with selectable text bypass OCR.
- [ ] Progress streams with sensible percentages and never claims early completion.
- [ ] Cancellation actually stops work on both sides.
- [ ] Unreadable pages are reported rather than dropped.
- [ ] Local OCR completes with the network disabled.

Detail: [[OCR Decision Tree]], [[Local Tesseract.js]].

## Behavioural feature changes

- [ ] Default remains off in `DEFAULT_SETTINGS` in `src/features/reader/config.js`.
- [ ] Nothing appears for a user who has not opted in.
- [ ] Reduced motion removes animation without removing content.
- [ ] The reading text is never obscured or blocked.
- [ ] Dismissal is single-action and focus is not trapped after close.
- [ ] No streak punishment, fake urgency, or variable-ratio payout was introduced.

Detail: [[Ethical Guardrails]], [[Behavioral Layer MOC]].

## Accessibility pass

- [ ] Keyboard-only navigation works through landing, import, reader, notes, settings.
- [ ] Every icon-only control has an accessible name.
- [ ] `aria-pressed` matches visible state on every toggle.
- [ ] Overlays use `aria-modal` and manage focus correctly.
- [ ] Closed panels leave the focus order.
- [ ] `node scripts/security/contrast.mjs` passes for every exposed theme.
- [ ] No horizontal overflow at 320px.
- [ ] Progress and status changes are announced.

Detail: [[Accessibility Rules]].

## Vault changes

- [ ] `npm run check:vault` prints PASS with all five counters at 0.
- [ ] Run it **from the repository root**. The script resolves the vault as
      `join(process.cwd(), 'brainobs')`, so from any other directory it throws `ENOENT`.
- [ ] No note was rewritten with a shell write that could add a BOM.
- [ ] Every touched note has `updated: 2026-10-02` or later.
- [ ] Every `source-files` path exists on disk and contains no comma.
- [ ] Every note still has at least one inbound wikilink from another note.

Detail: [[Vault Maintenance]], [[Context Sync Protocol]].

## Known baseline signals

These are expected on a clean tree. Do not treat them as regressions, and do not try to silence
them without a request.

| Gate | Baseline signal |
| --- | --- |
| `npm run lint` | 0 errors, **1 warning**: `src/features/reader/components/CommandPalette.jsx:12` `react-refresh/only-export-components`. Deliberate; the file explains why |
| `npm run build` | Chunks over 500 kB: `vendor-three` 736.73 kB, `index` 667.35 kB, `pdf` 329.86 kB, `vendor-react` 173.98 kB, `vendor-motion` 131.59 kB |
| `npm run build` | One `INEFFECTIVE_DYNAMIC_IMPORT`: `FocusCard.jsx` is dynamically imported by `FocusBarHost.jsx` but statically imported by `ReaderOverlays.jsx` |
| `pytest backend/tests/` | 75 passed with 1 `StarletteDeprecationWarning` for `HTTP_422_UNPROCESSABLE_ENTITY` |
| `node scripts/security/contrast.mjs` | PASS, 63 token pairs checked, 11 skipped as token-absent |
| `npx pyright` | **Not re-verified on 2026-10-02.** The last known result was 2 environment warnings. Treat as unknown until re-run |

Build duration is volatile and is deliberately not recorded here.

## The CI gap

`.github/workflows/` contains exactly two workflows and nothing else. No issue templates, no PR
template, no `CODEOWNERS`, no dependabot, no `CONTRIBUTING`, no `SECURITY`.

`webpack.yml`, job name `CI checks`, on push to `main` and pull request to `main`:

| Job | Matrix | Runs |
| --- | --- | --- |
| `frontend` | Node 20.x, 22.x | `npm ci`, `npm run lint`, `npm test`, `npm run build` |
| `backend` | Python 3.11, 3.12 | `pip install -r backend/requirements.txt`, `pytest backend/tests/ -v` |

**CI does not run `npm run test:e2e`, `npm run check:vault`, the contrast script, or pyright.**
Nothing gates a merge on e2e tests, vault integrity, WCAG contrast, or backend type checking. You
must run them yourself, and a green CI badge does not mean they passed.

`python-publish.yml` runs on `release: published`, builds, and publishes to PyPI via OIDC trusted
publishing with no stored secrets. It is a publishing job, not a check.

## Before finishing

- [ ] `git status --short --branch` reviewed for unintended files.
- [ ] No secrets, tokens, or private documents staged.
- [ ] No debug output or console noise left behind.
- [ ] Claims match implementation and status vocabulary.
- [ ] Affected vault notes updated with a new `updated` date.
- [ ] [[Current State Matrix]] updated if capability status changed.
- [ ] [[Context Sync Protocol]] followed for linked notes.

Detail: [[Commit Conventions]], [[Invariants]], [[Debugging Playbook]].