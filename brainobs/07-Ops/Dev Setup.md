---
title: Dev Setup
type: guide
status: verified
updated: 2026-10-02
tags: [bookflow, ops, setup, development]
source-files: [package.json,vite.config.js,playwright.config.js,.env.example,backend/start_backend.bat,backend/run.py,backend/app/core/config.py,pyrightconfig.json,README.md]
---

# Dev Setup

Two services, independently optional. The frontend works alone.

Every command in this note was checked against `package.json`, `vite.config.js`, or the
repository on 2026-10-02.

## Frontend

```bash
npm install
npm run dev
```

Runs Vite on `http://localhost:3000`, bound to `0.0.0.0` with `allowedHosts: true` so the dev
server is reachable from a phone on the same network.

Available scripts, verbatim from `package.json`:

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite --host 0.0.0.0 --port 3000` | Development server |
| `prebuild` | `node scripts/copy-assets.js` | Copies local OCR assets before build |
| `build` | `vite build` | Production bundle |
| `preview` | `vite preview` | Serve the built bundle. Takes no argument; Playwright supplies `--port 4175 --strictPort` |
| `test` | `vitest run` | Unit tests |
| `test:e2e` | `playwright test` | Browser tests against the preview build |
| `lint` | `eslint .` | Lint |
| `check:vault` | `node scripts/check-vault.mjs` | `brainobs` vault integrity |

There is no npm script for the WCAG contrast gate. Run `node scripts/security/contrast.mjs`
directly.

`prebuild` runs automatically before `build` because npm treats `pre<name>` as a lifecycle hook;
you never invoke it by hand.

## Backend

Windows convenience script:

```bash
cd backend
start_backend.bat
```

It creates a virtual environment named `venv` if it is missing, installs requirements, and runs
`python -m uvicorn main:app --port 8000 --reload`. The service listens on `http://localhost:8000`.

One gotcha: `start_backend.bat` creates `backend/venv`, but `pyrightconfig.json` points Pyright at
`backend/.venv`. They are different directories. If `pytest` or `npx pyright` cannot find the
dependencies, that is why.

Manual equivalent, using the `.venv` path that Pyright expects:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

`run.py` binds `0.0.0.0`, prints desktop, docs, and LAN URLs, and reloads when
`ENVIRONMENT=development`.

The backend is entirely optional. Standard import and local English OCR do not require it.

## Environment file

There is **no `backend/.env.example`**. The only template is `.env.example` at the repository
root. `backend/app/core/config.py` declares `env_file=".env"`, which is resolved relative to the
process working directory, so when you start the backend from `backend/` the file it reads is
`backend/.env`. Copy the root template there:

```bash
copy ..\.env.example .env
```

Every key in the template is optional. The gateway runs without any of them; the keys that matter
are `PADDLEOCR_URL` for the self-hosted worker and `HF_TOKEN` or `HF_API_KEY` for the Hugging Face
fallback.

Detail: [[Environment Config]].

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
- [ ] `npm run check:vault` passes if any `brainobs` note was edited.
- [ ] `node scripts/security/contrast.mjs` passes if a token or theme file was edited.
- [ ] `$env:PLAYWRIGHT_CHANNEL='chrome'; npm run test:e2e` passes if the reader surface changed.
- [ ] Optionally, the backend starts and `GET /api/health` responds.
- [ ] Optionally, an OCR scan streams progress.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Port 3000 in use | Another server running | Stop it, or change the dev port |
| Port 4175 in use | A stale `vite preview` from an earlier e2e run | `reuseExistingServer` is on, so Playwright will reuse a stale build. Kill it, rebuild, and rerun |
| Port 8000 in use | Backend already running | Reuse it, or stop the duplicate |
| Browser tests measure old behaviour | `dist/` is stale | Run `npm run build` before `npm run test:e2e`; the suite never hits the dev server |
| Playwright cannot find a browser | Bundled Chromium download unreliable here | `$env:PLAYWRIGHT_CHANNEL='chrome'` |
| Backend unreachable | Service not started | Start the backend or ignore it |
| `pyright` or `pytest` cannot import deps | `start_backend.bat` made `venv`, Pyright expects `.venv` | Recreate the environment as `.venv` |
| OCR assets 404 | Dev server started incorrectly | Restart Vite so the asset plugin initializes |
| Blank reader after import | Parse failure | Check the console, then test with the sample book |

Detail: [[Debugging Playbook]].

Related: [[Testing Pipeline]], [[Docker OCR]], [[Frontend Architecture]], [[Backend Architecture]].