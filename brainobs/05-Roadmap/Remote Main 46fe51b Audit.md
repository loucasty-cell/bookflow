---
title: Remote Main 46fe51b Audit
type: evidence
status: partial
updated: 2026-09-26
tags: [bookflow, roadmap, audit, reading-lens, skills]
source-files: [package.json, package-lock.json, vercel.json, playwright.config.js, AGENTS.md, src/features/reader/hooks/useReadingLens.js, src/features/reader/hooks/useReaderSelection.js, src/features/reader/components/FocusCard.jsx, src/features/reader/components/NotesPanel.jsx, src/features/reader/lib/notesPdfExport.js, src/features/reader/lib/notesExport.js, src/styles/reading-lens.css, tests/e2e/reading-lens.spec.js, backend/app/routers/reader.py, backend/app/services/document_service.py, backend/tests/test_reading_lens.py, backend/tests/test_document_pdf_guards.py, .agents/skills, skills-lock.json]
---

# Remote Main 46fe51b Audit

Evidence note for the fast-forward from `80dba85` to `46fe51b` (`feat: add reading lens and improve PDF support`). The remote commit is now the local `main` baseline. It shipped unfinished work; the repair pass below closed the P0 gaps, and the status stays `partial` because live provider verification, bundle budgets, and GitHub MCP authentication remain open.

## Sync completed

- Local `main` fast-forwarded cleanly to `46fe51b`.
- The local `skills-lock.json` and `bun.lock` were backed up outside the repository before the pull.
- All 13 `emilkowalski/skills` packages are present under `.agents/skills/` and recorded in `skills-lock.json`.
- `npx skills@latest list` discovers 34 project skills under `.agents/skills/`.
- The duplicate `agent/skills/` tree was removed because OpenCode discovers `.agents/skills/` only.
- The root `dark_mode_verify.png` and the divergent `bun.lock` were removed; backups are stored outside the repository.
- The pull remained recoverable through the backups at `%TEMP%\\opencode\\bookflow-skills-lock.local.json` and `%TEMP%\\opencode\\bookflow-bun.lock.local`.

## Pulled feature surface

| Area | Added or changed state |
| --- | --- |
| Reading Lens | Draggable focus card, selection hook, quick actions, chat input, consent gate, and backend SSE proxy |
| Selection | `useReaderSelection` plus a Reading Lens action in `SelectionTooltip` |
| Notes | Redesigned notes drawer, search, bold/delete/copy actions, Markdown export, paginated PDF export |
| Import | Empty-password PDF unlock attempts in PyMuPDF and pypdf paths |
| Landing/library | Sample-book resume path, resume-card redesign, touch tilt, ambient canvas guards |
| Skills | 13 Emil animation/design/mobile skills in `.agents/skills` (duplicate `agent/skills` tree removed) |
| Tooling | `@google/genai` (removed), `bun.lock` (removed), Vercel install override (removed), Playwright channel change |

## Verification after repair

Measured 2026-09-25 after the repair pass; frontend counts refreshed 2026-09-26:

| Check | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm test -- --run` | 39 files passed, 308 tests passed |
| `npm run build` | Pass; Tailwind utilities are emitted; non-failing chunk warnings for `vendor-three` (~516 kB) and the main chunk (~646 kB) |
| `pytest backend/tests/ -q` | 75 passed |
| `npx --no-install pyright` | 0 errors, 2 pre-existing environment warnings |
| `npm run check:vault` | Pass, 89 notes, no broken links or source paths |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` | 5 passed: 2 smoke, 1 long-import (420-page, 100% terminal, 0 overflow), 2 Reading Lens responsive tests |
| `npm audit --omit=dev` | 0 production vulnerabilities; full audit still reports 5 dev-only findings |

## Repairs completed

1. `@google/genai` was removed from `package.json` and the lockfile was regenerated; `pdf-lib` moved to production dependencies; the Vercel `installCommand` override was removed.
2. `/api/reader/segment`, `/api/reader/reading-time`, `/api/reader/notes/export`, and `/api/reader/notes/import` are restored with route-contract tests.
3. `/api/reading-lens` is explicit opt-in (`consent: true`), bounded, rate-limited, async, streamed over SSE, and refuses to fabricate an answer when the provider is unconfigured.
4. The frontend Lens no longer holds a provider key, requires a selection, keeps the Lens off until consent, and handles abort, stale responses, and fallback metadata.
5. Selection handoff, pointer/keyboard dragging, viewport clamping, and persisted position were repaired; Figma-derived geometry now lives in `src/styles/reading-lens.css`.
6. Long notes paginate across PDF pages, unsupported glyphs are sanitized with a user-visible report, and export failures surface in the notes drawer.
7. Tailwind source scanning, 44px hit areas, `320px`/`390px` no-overflow, reduced motion, drag `user-select`, and status `aria-live` regions were added.
8. `agent/skills/`, `bun.lock`, and `dark_mode_verify.png` were removed; backups live outside the repository.

## Remaining gaps and bottlenecks

1. Live provider behavior is unverified because no provider key is committed or used in tests; the browser path is covered by mocks and backend contract tests only.
2. `pyright` still reports two environment/source warnings (`defusedxml`, `setuptools`).
3. The build still warns on the `646 kB` main chunk and `516 kB` Three.js chunk; no bundle budget is enforced in CI.
4. Full `npm audit` still reports 5 development-only vulnerabilities; the production tree is clean.
5. GitHub MCP browser OAuth cannot complete: the remote endpoint does not support dynamic client registration and Docker is unavailable. A pre-registered OAuth app or an environment-backed PAT is required.
6. `fetch` MCP reported `Connection closed` and `npx playwright install chromium` times out, so browser verification runs on the system Chrome channel via `PLAYWRIGHT_CHANNEL=chrome`. Verified working 2026-09-26.
7. The Figma credential stored in the ignored local config was exposed in an earlier session and must be rotated or revoked by the user.
8. Reading Lens rate limiting is per process and in-memory; multi-user auth and durable quotas are not implemented.

## Repair order used

1. Restored one dependency source of truth and made the frontend build green.
2. Restored the `/api/reader` route contract and added tests for every reader route.
3. Added explicit opt-in consent and egress disclosure; the Lens stays off by default until then.
4. Made the Lens response contract explicit, bounded inputs, moved to async HTTP, and added provider/rate-limit tests.
5. Repaired drag, selection, streaming, PDF export, touch targets, and responsive layout.
6. Removed duplicate skills and verification artifacts.
7. Re-ran the full pipeline, then updated [[Current State Matrix]] and [[Testing Pipeline]].

## Agent readiness

- Canonical project skills live in `.agents/skills/`; use `npx skills@latest list` to verify discovery.
- The local OpenCode config is ignored and contains MCP configuration only; never commit it.
- The GitHub MCP remote entry is present locally, but browser OAuth cannot complete because the remote endpoint does not support dynamic client registration and Docker is unavailable. Use a pre-registered OAuth app or a local environment-backed PAT before relying on it.
- Figma, Pencil, Playwright, sequential-thinking, Context7, and memory are currently discoverable; fetch is still failing.

Related: [[Current State Matrix]], [[Backlog P0-P1-P2]], [[Testing Pipeline]], [[Backend Endpoints]], [[Context Sync Protocol]].
