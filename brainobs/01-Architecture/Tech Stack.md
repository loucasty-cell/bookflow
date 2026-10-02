---
title: Tech Stack
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, architecture, stack, dependencies]
source-files: [package.json,backend/requirements.txt,backend/ocr-worker-requirements.txt,backend/pyproject.toml,vite.config.js,vitest.config.js,playwright.config.js,eslint.config.js]
---

# Tech Stack

Every dependency with the exact job it does, and an honest note where there is no job. Versions
copied from `package.json`, `backend/requirements.txt`, and `backend/ocr-worker-requirements.txt`
on 2026-10-02.

## Frontend runtime dependencies

| Package | Declared | Responsibility |
| --- | --- | --- |
| `react` | `19.0.0` | Component model and rendering |
| `react-dom` | `19.0.0` | DOM renderer, root mount |
| `zustand` | `^5.0.15` | Global state. One persisted store, one ephemeral store, one feature-local store |
| `framer-motion` | `^13.1.1` | Spring physics, `AnimatePresence`, `useMotionValue` / `useSpring` / `useTransform` on book cards |
| `swr` | `^2.5.1` | **Installed and unused.** No source file imports it. It does get a `vendor-state` chunk because `manualChunks` matches the string |
| `three` | `^0.186.0` | Ambient dust layer only, lazily imported so it stays out of the entry graph |
| `lenis` | `^1.3.26` | Sentence-paced smooth scroll, dynamically imported in `features/scroll/smoothScroll.js:63`. Its stylesheet is the first `@import` in `styles.css` |
| `gsap` | `^3.15.0` | Single shared ticker driving every Lenis instance (`smoothScroll.js:9-17`), plus `ScrollTrigger` for widget reveal (`widgets/lib/useWidgetReveal.js:23`). Both dynamically imported |
| `animejs` | `^4.5.0` | Widget value tweens and ring fills, statically imported in `widgets/lib/widgetMotion.js` and scoped per widget with `createScope` |
| `@splinetool/runtime` | `^1.12.96` | Optional Spline scene for the focus bar. `FocusBarAmbient.jsx:30` dynamically imports it only when `VITE_SPLINE_SCENE` names a `.splinecode` URL; otherwise a procedural backdrop runs |
| `lucide-react` | `^0.468.0` | Interface icons |
| `pdfjs-dist` | `^4.10.38` | Local PDF text extraction and page rendering |
| `jszip` | `^3.10.1` | Local EPUB archive reading |
| `tesseract.js` | `^7.0.0` | On-device OCR for scanned pages |
| `tesseract.js-core` | `^7.0.0` | WASM OCR cores, served locally by the Vite plugin |
| `@tesseract.js-data/eng` | `^1.0.0` | Bundled English trained data, `4.0.0_best_int` |
| `pdf-lib` | `^1.17.1` | Note export to PDF. Imported by `src/features/reader/lib/notesPdfExport.js` and by the Playwright long-import fixture |

Two honesty notes:

- **`swr` does nothing today.** It is in `dependencies` and imported by no source file. It still
  gets a `vendor-state` chunk because `manualChunks` matches the string.
- **`gsap`, `lenis`, and `@splinetool/runtime` are all dynamically imported**, so they land in their
  own chunks even though `manualChunks` has no entry for them. `animejs` and `pdf-lib` are static
  imports and do ride the entry chunk.

## Frontend development dependencies

| Package | Declared | Responsibility |
| --- | --- | --- |
| `vite` | `^8.2.2` | Dev server and bundler |
| `tailwindcss` | `^4.3.3` | Utility-only Vite layer, no preflight, no second token system |
| `@tailwindcss/vite` | `^4.3.3` | Tailwind Vite integration |
| `@vitejs/plugin-react` | `^6.1.0` | React fast refresh and JSX transform |
| `vitest` | `^2.1.8` | Unit test runner. `vitest.config.js` sets only `test.include` |
| `@playwright/test` | `^1.63.0` | Browser tests: smoke, the 420-page long import, and two Reading Lens responsive specs |
| `@playwright/mcp` | `^0.0.82` | MCP server exposing the browser to the agent |
| `eslint` | `^9.17.0` | Flat config lint |
| `@eslint/js` | `^9.17.0` | `js.configs.recommended` |
| `eslint-plugin-react-hooks` | `^5.1.0` | `reactHooks.configs.recommended` |
| `eslint-plugin-react-refresh` | `^0.4.16` | `react-refresh/only-export-components`, warn, `allowConstantExport` |
| `globals` | `^15.14.0` | Browser and node globals for ESLint |
| `@modelcontextprotocol/server-memory` | `^2026.8.31` | MCP knowledge-graph memory store |
| `@modelcontextprotocol/server-sequential-thinking` | `^2026.8.31` | MCP structured-reasoning server |
| `@upstash/context7-mcp` | `^4.1.1` | MCP server for up-to-date library documentation |

## Frontend test tooling constraint

There is **no DOM test environment installed**: no `jsdom`, no `happy-dom`, no `@testing-library`.
`vitest.config.js` is seven lines and declares only
`test.include: ["src/**/*.test.{js,jsx}"]` -- no `environment`, no `setupFiles`, no `globals`.

So:

- Component tests render with `renderToStaticMarkup` from `react-dom/server`.
- Hook tests use a hand-rolled harness that `vi.mock`s `react`.
- Anything needing a real DOM is a Playwright test.

`playwright.config.js` runs against a **production preview build**, not the dev server:
`testDir tests/e2e`, `baseURL http://localhost:4175`, `webServer` runs
`npm run preview -- --port 4175 --strictPort` with `reuseExistingServer: true`, `timeout 60000`,
`fullyParallel false`, reporter `list`, no `projects` block, and
`channel: process.env.PLAYWRIGHT_CHANNEL || undefined`. On this machine the system Chrome channel
must be set, because the bundled Chromium download is unreliable.

## Build configuration facts

| Setting | Value | Effect |
| --- | --- | --- |
| `base` | `./` | Relative asset paths, works from any static host subpath |
| `build.target` | `es2022` | Modern output |
| `server.port` | `3000`, host `0.0.0.0`, `allowedHosts: true` | Dev server, reachable from a phone on the LAN |
| `server.proxy` | `/api` -> `http://127.0.0.1:8000` | Local backend without CORS friction |
| `server.watch.ignored` | PDFs, `dist`, `.venv`, `__pycache__`, `.pytest_cache`, `node_modules` | Avoids reload churn from documents and backend churn |
| Path aliases | **none** | Every cross-directory import is relative |
| Plugins | `react()`, `tailwindcss()`, `localOcrAssets()` | The OCR plugin is local, not a package |

### Manual chunks

`manualChunks` fires only for `node_modules` paths:

| Chunk | Matches |
| --- | --- |
| `vendor-three` | `three` |
| `vendor-motion` | `framer-motion` |
| `vendor-icons` | `lucide-react` |
| `vendor-react` | `react`, `react-dom` |
| `vendor-state` | `zustand`, `swr` |

There is **no chunk for `lenis`, `gsap`, `animejs`, `@splinetool/runtime`, or `pdf-lib`.** Those ride
the entry chunk today. If the build warnings matter, adding them is a one-line change.

## Backend dependencies

`backend/requirements.txt`, lower bounds only:

| Package | Declared | Responsibility |
| --- | --- | --- |
| `fastapi` | `>=0.115.0` | Async API framework and routing |
| `uvicorn[standard]` | `>=0.30.0` | ASGI server |
| `pydantic` | `>=2.8.0` | Schema validation |
| `pydantic-settings` | `>=2.4.0` | Environment-backed settings |
| `python-multipart` | `>=0.0.9` | Multipart file uploads |
| `httpx` | `>=0.27.0` | Async client with connection pooling; all provider traffic |
| `huggingface_hub` | `>=1.0.0,<2.0.0` | **Declared, never imported.** The HF client speaks to the inference router over plain `httpx` |
| `Pillow` | `>=10.4.0` | Image handling; also used by the test fixtures |
| `pypdf` | `>=4.3.0` | Secondary PDF text extraction path |
| `PyMuPDF` | `>=1.24.0` | Rasterization and text extraction. This is the OCR rendering engine |
| `openai` | `>=1.40.0` | **Declared, never imported.** Provider calls are hand-built JSON over `httpx` |
| `sse-starlette` | `>=2.1.0` | **Declared, never imported.** SSE is hand-rolled in `ocr_sse.py` and `reader.py` |
| `beautifulsoup4` | `>=4.12.0` | XHTML cleanup inside `document_service.py` |
| `python-dotenv` | `>=1.0.1` | Loads `backend/.env` then `../.env` |
| `pytest` | `>=8.3.0` | Backend tests |
| `pytest-asyncio` | `>=0.24.0` | Async test support; `asyncio_mode = "auto"` |

Three declared-but-unused packages: `openai`, `sse-starlette`, `huggingface_hub`. They inflate the
install image and mislead a reader of `requirements.txt`. Removing them is a safe cleanup, but it
changes the environment, so it needs approval.

`backend/pyproject.toml` adds `ruff>=0.6.0`, `black>=24.8.0`, `mypy>=1.11.0`, `build>=1.2.0`, and
`wheel>=0.44.0` under the `dev` extra, and configures `line-length = 100` for both tools.

## PaddleOCR worker container

`backend/ocr-worker-requirements.txt`, fully pinned, because a floating PaddleOCR dependency
resolves to a different model on every rebuild:

| Package | Pinned |
| --- | --- |
| `fastapi` | `==0.116.1` |
| `uvicorn[standard]` | `==0.35.0` |
| `paddleocr` | `==3.7.0` |
| `paddlepaddle` | `==3.3.1` |
| `numpy` | `==2.2.6` |
| `Pillow` | `==11.3.0` |

Built from `backend/Dockerfile.ocr`, run by `backend/ocr_worker.py`. Detail: [[Docker OCR]].

## Measured baseline, 2026-10-02

| Command | Result |
| --- | --- |
| `npm run lint` | 0 errors, 1 warning (`CommandPalette.jsx:12:17`, `react-refresh/only-export-components`) |
| `npm test` | 52 files, 506 tests passing |
| `npm run build` | 10.53s. Chunk-size warnings over 500 kB, plus one `INEFFECTIVE_DYNAMIC_IMPORT` warning for `FocusCard.jsx` |
| `npm run check:vault` | PASS |
| `node scripts/security/contrast.mjs` | PASS, 63 pairs checked, 11 skipped as token-absent |
| `pytest backend/tests` | 75 passed, 1 Starlette deprecation warning |
| Playwright | 19 tests across 4 specs |
| `npx pyright` | **not re-run today.** Last known result was 2 environment warnings |

Known non-failing baseline signals: the chunk-size warnings, the `FocusCard.jsx` ineffective dynamic
import, the single `react-refresh` warning, the Starlette deprecation warning, and dev-only findings
from a full `npm audit` (`npm audit --omit=dev` is clean).

## Dependency rules

1. Do not add a dependency without explicit approval.
2. Prefer native browser APIs and existing packages.
3. Keep heavy parsing libraries lazily imported so the entry chunk stays parser-free.
4. Pin anything whose resolution changes model behaviour, as `ocr-worker-requirements.txt` does.

## Deliberately absent

| Not used | Why |
| --- | --- |
| CSS preflight or reset | Disabled. Semantic tokens in `src/styles/tokens.css` remain authoritative |
| Path aliases | Every cross-directory import is relative, so the graph is readable without config |
| A charting library | The flow sparkline is drawn, not imported |
| Analytics SDKs | Book text must never reach a third party |
| A UI component kit | Bespoke reader ergonomics, not generic components |
| A state machine library | The import manifest covers the same ground more simply |
| A DOM test environment | Not installed. Server-rendered markup plus Playwright covers it |

Related: [[Frontend Architecture]], [[Backend Architecture]], [[Dev Setup]].