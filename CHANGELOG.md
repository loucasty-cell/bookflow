# Changelog

All notable changes to Bookflow. This project follows semantic versioning.

## Unreleased

Verified on `feat/apple-ui`. Full gate: 57 test files / 555 tests, 19 e2e, 75
backend tests, 0 lint errors, 0 pyright errors, vault check PASS.

### Added

- **Navigator resize.** The reader's left panel is now a ratio of the reader
  layout instead of a fixed pixel width, so it keeps its proportion when the
  window changes. Drag the divider, or focus it and use the arrow keys (Shift
  for larger steps, Home to reset). The preference persists per reader.
  Below 900px the panel is an off-canvas drawer, so the divider is not shown.
- `src/design/geometry.ts`, a single numeric source of truth for spacing,
  radius, type, layering and hit targets, with a test that fails if
  `tokens.css` drifts from it. `npm run typecheck` is new.
- `src/styles/a11y.css`, a global fallback layer for `forced-colors`,
  `prefers-contrast: more` and `prefers-reduced-transparency`.
- Inline keyboard shortcut hints in the reader command palette.
- `build.md`, documenting the verification pipeline with measured values.
- `vercel.json` now sets `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `X-Frame-Options`, immutable caching for hashed
  assets, and a **report-only** Content-Security-Policy.

### Changed

- Interface type is floored at the `--ui-caption` token. 146 hardcoded font
  sizes at or below 12px across 11 stylesheets, including fractional
  8.5/9.5/10.5/11.5px values, now use the token. This is a **visible** change:
  the smallest chrome labels grow, and labels that were different sizes are now
  the same size, so some hierarchy between label levels is gone.
- The navigator is a ratio of the layout, so its default width matches the old
  fixed 294px at a 1440px window and scales proportionally elsewhere. Viewports
  below roughly 1400px sit at the 280px floor.
- The reader topbar has one owner for its height. A dead `min-height: 56px` in
  `reader.css` was overridden by `68px` in `components.css`; the dead
  declaration is gone and the value is unchanged at 68px.
- Removed the npm `eslint` warning's underlying ambiguity by giving the reader
  navigator a single width declaration instead of three that disagreed.

### Fixed

- Closing a book threw `TypeError: gsapModule.ticker.clear is not a function`
  into the ErrorBoundary. GSAP's ticker has no `clear()`; it has `remove()`.
  Every reader teardown logged an error the user could not act on. The test
  double had invented a `clear()`, which is why it was never caught.
- Notes panel traffic lights were interactive 10x10px buttons. They now carry a
  44px hit area while keeping the 10px visual dot.
- Notes panel controls and the skip link now meet the 44px minimum target.
- At exactly a 320px viewport the page scrolled 15px sideways, because
  `body { min-width: 320px }` out-ran the space a scrollbar left available.
- The navigator's stats row ellipsised "Bookmarks" once the caption token
  raised the label from 10.5px to 12px.

### Security

- No provider key is present in the browser bundle. All remote Reading Lens
  traffic goes through the backend and is consent-gated per session.
- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` or
  `document.write` anywhere in `src`. No `eval`, `exec`, `pickle` or
  `subprocess` in the backend.
- CORS uses an explicit, environment-driven origin list with credentials; no
  wildcard.
- No document text, passage or answer is written to server logs.
- The CSP ships **report-only**. It must be promoted to enforcing only after a
  real run reports zero violations, because Tesseract WASM, web workers and
  bundled fonts need `wasm-unsafe-eval`, `blob:` workers and `data:` fonts.

### Known limitations

- **No rate limiting on the backend.** OCR and the Reading Lens assistant are
  unauthenticated and unthrottled. Adding it means a new dependency, so it is
  proposed rather than installed.
- **No offline support.** With no service worker, going offline shows the
  browser's error page rather than an app-level state. A service worker would
  be a new dependency and a caching policy decision.
- **`prefers-reduced-transparency` is unverified in a browser.** It cannot be
  emulated through the available Playwright media controls. It is verified by
  cascade order and by `src/design/stylesheet.test.js`, not by rendering.
- **The loading state was not reproduced.** The available route interception
  did not delay the module the app waits on, so the loading UI is unverified.
- `.licenses` covers four literature-search licences only. npm dependency
  licences and the bundled Tesseract/`eng.traineddata` assets are **not**
  accounted for there.
- Contrast is verified for token pairs. The `paper` theme prints `token absent`
  notes for pairs that resolve through inheritance and still passes.