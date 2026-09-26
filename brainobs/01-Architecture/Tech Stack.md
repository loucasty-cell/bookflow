---
title: Tech Stack
type: reference
status: verified
updated: 2026-09-25
tags: [bookflow, architecture, stack, dependencies]
source-files: [package.json, backend/requirements.txt, vite.config.js]
---

# Tech Stack

Every dependency with the exact job it does. Nothing here is decorative.

## Frontend runtime dependencies

| Package | Version | Responsibility |
| --- | --- | --- |
| `react` | 19.0.0 | Component model and rendering |
| `react-dom` | 19.0.0 | DOM renderer, root mount |
| `zustand` | 5.0.15 | Global state, persisted settings |
| `framer-motion` | 13.1.1 | Spring physics, `AnimatePresence` transitions |
| `swr` | 2.5.1 | Available for future remote integrations; not used by the current reader path |
| `lucide-react` | 0.468.0 | Interface icons |
| `pdfjs-dist` | 4.10.38 | Local PDF text extraction and page rendering |
| `jszip` | 3.10.1 | Local EPUB archive reading |
| `tesseract.js` | 7.0.0 | On-device OCR for scanned pages |
| `tesseract.js-core` | 7.0.0 | WASM OCR cores |
| `@tesseract.js-data/eng` | 1.0.0 | Bundled English trained data |
| `three` | 0.186.0 | Ambient visual layer only |
| `lenis` | 1.3.26 | Sentence-paced smooth scroll for the reader scroll container |
| `gsap` | 3.15.0 | Single shared ticker driving Lenis, and ScrollTrigger for widget reveal |
| `animejs` | 4.5.0 | Widget value tweens and ring fills, scoped per widget |
| `@splinetool/runtime` | 1.12.96 | Optional Spline scene for the focus bar. Loaded only when a `.splinecode` URL is configured; otherwise a procedural shader is used |
| `pdf-lib` | 1.17.1 | Test fixture PDF generation. Lives in `dependencies` but is not imported from `src/` |

## Frontend development dependencies

| Package | Version | Responsibility |
| --- | --- | --- |
| `vite` | 8.2.2 | Dev server and bundler |
| `tailwindcss` | 4.3.3 | Utility-only Vite layer; no preflight or second token system |
| `@tailwindcss/vite` | 4.3.3 | Tailwind Vite integration |
| `@vitejs/plugin-react` | 6.1.0 | React fast refresh and JSX transform |
| `vitest` | 2.1.8 | Unit test runner |
| `eslint` | 9.17.0 | Lint with `@eslint/js`, react-hooks, react-refresh |
| `globals` | 15.14.0 | ESLint global definitions |

## Backend dependencies

| Package | Responsibility |
| --- | --- |
| `fastapi` | Async API framework and routing |
| `uvicorn[standard]` | ASGI server |
| `pydantic` / `pydantic-settings` | Schema validation and settings |
| `python-multipart` | Multipart file uploads |
| `httpx` | Async client with connection pooling |
| `huggingface_hub` | Provider client |
| `Pillow` | Image preprocessing |
| `PyMuPDF` | PDF rasterization and text extraction |
| `pypdf` | Secondary extraction path |
| `openai` | OpenAI-compatible vision endpoints |
| `sse-starlette` | SSE support alongside manual streaming |
| `beautifulsoup4` | Markup parsing |
| `python-dotenv` | Environment loading |
| `pytest` / `pytest-asyncio` | Backend tests |

| `@playwright/test` | 1.63.0 | Browser test runner for smoke, long-import, and Reading Lens specs |
| `@playwright/mcp` | 0.0.82 | MCP server exposing the browser to the agent. Installed as a devDependency and launched with `node node_modules/@playwright/mcp/cli.js` |
| `@modelcontextprotocol/server-sequential-thinking` | 2026.8.31 | MCP server for structured reasoning |
| `@modelcontextprotocol/server-memory` | 2026.8.31 | MCP server for the knowledge-graph memory store |
| `@upstash/context7-mcp` | 4.1.1 | MCP server for up-to-date library documentation |
## Build configuration facts

| Setting | Value | Effect |
| --- | --- | --- |
| `base` | `./` | Relative asset paths, host anywhere |
| `build.target` | `es2022` | Modern output |
| `server.port` | `3000` | Dev server |
| `server.proxy` | `/api` to `127.0.0.1:8000` | Local backend without CORS friction |
| Manual chunks | three, motion, icons, react, state | Cache-friendly vendor splitting |

## Dependency rules

1. Do not add a dependency without explicit approval.
2. Prefer native browser APIs and existing packages.
3. Keep heavy parsing libraries lazy-loaded.
4. Keep the initial bundle free of parser code.

## Deliberately absent

| Not used | Why |
| --- | --- |
| CSS preflight/reset | Disabled; semantic tokens in `styles.css` remain authoritative |
| Charting libraries | The flow sparkline is drawn, not imported |
| Analytics SDKs | Book text must never reach a third party |
| UI component kits | Bespoke reader ergonomics, not generic components |
| State machines | The import manifest covers the same ground more simply |

Related: [[Frontend Architecture]], [[Backend Architecture]], [[Dev Setup]].
