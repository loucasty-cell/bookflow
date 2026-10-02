---
title: Roadmap MOC
type: MOC
status: living
updated: 2026-10-02
tags: [bookflow, roadmap, moc, planning]
source-files: [brainobs/05-Roadmap/Current State Matrix.md,brainobs/07-Ops/Testing Pipeline.md,playwright.config.js,package.json]
---

# Roadmap MOC

What exists, what is next, and how progress will be measured.

## Notes

- [[Current State Matrix]] - the single source of truth for verified versus planned
- [[Remote Main 46fe51b Audit]] - pulled Reading Lens baseline, verification failures, and repair order
- [[Backlog P0-P1-P2]] - prioritized work, merged from the project planning documents
- [[Audit Compare Replan]] - Bookflow audited capability by capability against competitors
- [[Massive Upgrade Backlog]] - the 24 item prioritized UI and experience upgrade list
- [[Future Features MOC]] - spec-ready designs for larger capabilities
- [[Success Metrics]] - measurable outcomes and current baselines
- [[Library and Reading Stats]] - the built metadata library, goals, and achievements
- [[TTS Synchronization]] - speech locked to the focus rail
- [[PWA Offline]] - manifest, service worker, durable local storage
- [[Concept Graph]] - cross-chapter definition linking
- [[Focus Rail Performance]] - why the focus rail is not a linear scan, and the measured baseline
- [[Testing Pipeline]] - the real gate set, and the missing DOM test environment

## Priority order

```text
Now       File-handle reopen without re-selection, repeated import benchmarks,
          durable document wiring, published p50/p95 numbers
Next      Look-back surface, want-to-read queue, versioned annotation bundle
Later     PWA install, reading moods, auto night theme, TTS synchronization,
          concept graph
Deferred  Persistent social layer, native wrappers
```

The 2026-09 Reading Lens repair pass is closed. The recent books shelf and chapter time-left have
since shipped, so the return loop is narrower than it was. See [[Audit Compare Replan]] for the
reasoning and [[Massive Upgrade Backlog]] for the item-by-item specs.

## The ordering logic

Measure first, then make the import path durable, then polish. Polishing visuals while import
reliability and long-book performance remain unmeasured spends effort on the wrong risk.

## What gates a claim

| Claim | Requires |
| --- | --- |
| Web-ready | Verified responsive app. Current status |
| PWA-ready | Manifest, icons, service worker, offline behaviour, install flow all tested |
| Native-store-ready | Platform packaging, permissions, signing, store assets, device testing |
| Shipped feature | Implemented, tested, and verified in a browser |

## What CI actually enforces

Verified 2026-10-02 against `.github/workflows/webpack.yml`, job `CI checks`:

| Gate | In CI |
| --- | --- |
| `npm run lint` | Yes, Node 20.x and 22.x |
| `npm test` | Yes, Node 20.x and 22.x |
| `npm run build` | Yes, Node 20.x and 22.x |
| `pytest backend/tests/ -v` | Yes, Python 3.11 and 3.12 |
| `npm run test:e2e` | **No** |
| `npm run check:vault` | **No** |
| `node scripts/security/contrast.mjs` | **No** |
| `npx pyright` | **No** |

CI runs on push to `main` and on pull requests to `main`. A green badge therefore means lint, unit,
build, and backend tests passed, and nothing more. Run the missing gates locally before claiming a
browser or vault result. See [[Testing Pipeline]].

## Status vocabulary

Use exactly these words when describing capability:

| Word | Meaning |
| --- | --- |
| Verified | Confirmed against source and runtime |
| Partial | Implemented with a stated scope limit |
| Planned | Designed, not implemented |
| Exploratory | Under consideration, no commitment |

Detail: [[Ethical Guardrails]], [[Competitor Analysis]], [[Verification Checklist]].