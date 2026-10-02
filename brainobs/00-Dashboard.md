---
title: Bookflow Brain
type: MOC
status: living
updated: 2026-10-02
tags: [bookflow, index, moc]
---

# Bookflow Brain

Second-brain vault for the Bookflow project. One Obsidian vault that explains what Bookflow
is today, how the full stack actually runs, why the reading experience is designed the way it
is, and what can be built next without breaking the invariants.

Read this note first. Every other note is one hop away.

## Start here

| If you are... | Read this |
| --- | --- |
| An AI agent picking up a task | [[Agent Quickstart]] then [[Invariants]] |
| A new developer | [[Full-Stack Overview]] then [[Dev Setup]] |
| Working on the reader | [[Focus Rail]], [[Reader Engine MOC]], [[Reading Lens]], [[Reading Lens Bar]], [[Sentence-Paced Scroll]], [[Command Palette]] |
| Working on import or OCR | [[OCR Pipeline MOC]], [[OCR-Frontend Sync Contract]] |
| Working on UX or visual design | [[Design Tokens]], [[Premium Micro-interactions]], [[Figma Inspection Evidence]], [[Home Widgets]], [[Graphics Quality Tiers]] |
| Working on the library or landing | [[Library and Reading Stats]], [[Home Widgets]] |
| Working on growth or retention | [[Atomic Habits Framework]], [[Ethical Guardrails]] |
| Writing a new feature spec | [[Feature Spec Template]] |
| Updating this vault after a code change | [[Context Sync Protocol]] |

## Maps of content

- [[Architecture MOC]] - stack, data flow, contracts, persistence
- [[Reader Engine MOC]] - focus, typography, themes, notes, lens, palette
- [[Document Import MOC]] - parsers, validation, scheduler
- [[OCR Pipeline MOC]] - decision tree, local and backend engines, SSE
- [[Behavioral Layer MOC]] - capsules, interventions, social resonance
- [[Psychology MOC]] - habit science, flow, ethics, competition
- [[UX Playbook MOC]] - tokens, layouts, motion, accessibility, widgets
- [[Roadmap MOC]] - current state, backlog, future features, metrics
- [[API Reference MOC]] - endpoints, public APIs, environment
- [[Ops MOC]] - setup, Docker, testing, debugging
- [[Agent Context MOC]] - invariants, file map, verification
- [[Competitor Research MOC]] - primary-source research on Kindle, Apple Books, Everand, Libby, Goodreads, Bookly, Fable
- [[Vault Maintenance]] - how to keep this vault true
- [[Context Sync Protocol]] - the update process after every code change

## The project in nine statements

```text
Bookflow is a private, local-first browser reader for PDF, EPUB, TXT, and Markdown.
Its core interaction is scroll-driven sentence and paragraph focus at FOCUS_RAIL_RATIO = 0.38.
The frontend is seven features behind public index.js barrels: reader, document-import,
library, landing, lens-bar, widgets, and scroll, plus shared/, store/, and components/.
The backend (FastAPI + PyMuPDF + PaddleOCR) is an optional accelerator for scanned pages only,
with a 50 MB upload ceiling; the user must explicitly start that scan.
Progressive PDF import reports progress from 5 through a terminal 100 before the reader opens;
EPUB, TXT, and Markdown currently use the blocking parser.
A metadata-only library records sessions, pace, goals, and achievements and can show a resume
card and a recent shelf; file-handle reuse and automatic reopen remain open.
The Reading Lens answers questions about a selected passage on two surfaces that share one
instance: a selection focus card and a draggable lens bar, both consent-gated.
A Figma-derived home widget grid and a device-tiered ambient canvas sit on the landing surface.
```

## Non-negotiables in one glance

1. Local-first privacy. Book text stays on the device on the default path; only an explicitly started accelerated scan sends page images to the configured backend.
2. React text nodes only. Never `dangerouslySetInnerHTML` for book contents.
3. Focus rail. Scrolling pulls the active unit to 38 percent of the reader viewport.
4. Opt-in behavioral layer. Reward capsules and interventions default to `false`.
5. Deterministic progress. No variable-ratio reward mechanics, no streak punishment.
6. Lens egress is opt-in per session. No selection means no request, and the backend rejects a request without `consent: true`.

Full detail in [[Invariants]].

## Verified baseline

Measured on `main` at tree `cb3c71f`, 2026-10-02, after the merge of `feat/lens-bar`:

| Gate | Command | Result |
| --- | --- | --- |
| ESLint | `npm run lint` | 0 errors, 1 warning (`CommandPalette.jsx:12`, fast-refresh) |
| Unit | `npm test` | 52 files, 506 tests passing |
| Vault | `npm run check:vault` | PASS, 93 notes |
| Build | `npm run build` | built in 10.53s, chunk-size warnings above 500 kB |
| Contrast | `node scripts/security/contrast.mjs` | PASS, 63 pairs checked, 11 skipped as token-absent |
| Backend | `pytest backend/tests/` | 75 passed, 1 Starlette deprecation warning |
| Browser | `npm run test:e2e` | 19 tests in 4 spec files |

## Status legend

Every note carries frontmatter so status is never guessed:

| Field | Meaning |
| --- | --- |
| `status: verified` | Confirmed against source code in this repository |
| `status: partial` | Partially implemented; scope is stated in the note |
| `status: planned` | Designed but not implemented; do not describe as existing |
| `status: living` | Index or process note that changes as the project changes |
| `source-files:` | Real repository paths that back the note's claims |
| `updated:` | Date the note was last reconciled with source |

## Vault rules

- This vault describes the repository as it is, plus clearly labelled plans.
- Never blur "verified" with "planned".
- When code changes, update the affected note and its `updated` field in the same change.
- Process for that: [[Context Sync Protocol]].