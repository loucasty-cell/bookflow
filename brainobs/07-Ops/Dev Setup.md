---
title: Dev Setup
type: guide
status: verified
updated: 2026-09-18
tags: [bookflow, ops, setup, development]
source-files: [package.json, vite.config.js, backend/start_backend.bat, backend/run.py, README.md]
---

# Dev Setup

Two services, independently optional. The frontend works alone.

## Frontend

```bash
npm install
npm run dev
```

Runs Vite on `http://localhost:3000`, bound to `0.0.0.0` with `allowedHosts: true` so the dev
server is reachable from a phone on the same network.

Available scripts:

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite --host 0.0.0.0 --port 3000` | Development server |
| `prebuild` | `node scripts/copy-assets.js` | Copies assets before build |
| `build` | `vite build` | Production bundle |
| `preview` | `vite preview` | Serve the built bundle |
| `test` | `vitest run` | Unit tests |
| `lint` | `eslint .` | Lint |

## Backend

Windows convenience script:

```bash
cd backend
start_backend.bat
```

It creates a virtual environment if needed, installs requirements, and starts uvicorn. The
service listens on `http://localhost:8000`.

Manual equivalent:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The backend is entirely optional. Standard import and local English OCR do not require it.

## Wiring

Vite proxies `/api` to `http://127.0.0.1:8000`:

```js
proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true, secure: false } }
```

So the frontend calls `/api/...` in dev with no CORS configuration needed. For a deployed
backend, set `VITE_API_URL` to its base URL.

Detail: [[Environment Config]].

## Watch ignores

Vite ignores PDFs, `dist`, `backend/.venv`, `__pycache__`, `.pytest_cache`, and `node_modules`
to avoid recompiling on file writes that are not source changes. This matters because generated
fixture PDFs and Python bytecode would otherwise trigger constant reloads.

## First-run checklist

- [ ] `npm install` completes.
- [ ] `npm run dev` serves on port 3000.
- [ ] The landing page renders with the drop card and sample book.
- [ ] The sample book opens and the focus rail follows scroll.
- [ ] `npm run lint`, `npm test`, and `npm run build` all pass.
- [ ] Optionally, the backend starts and `GET /api/health` responds.
- [ ] Optionally, an OCR scan streams progress.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Port 3000 in use | Another server running | Stop it, or change the dev port |
| Port 8000 in use | Backend already running | Reuse it, or stop the duplicate |
| Backend unreachable | Service not started | Start the backend or ignore it |
| OCR assets 404 | Dev server started incorrectly | Restart Vite so the asset plugin initializes |
| Blank reader after import | Parse failure | Check the console, then test with the sample book |

Detail: [[Debugging Playbook]].

Related: [[Testing Pipeline]], [[Frontend Architecture]], [[Backend Architecture]].