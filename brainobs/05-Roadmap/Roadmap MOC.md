---
title: Roadmap MOC
type: MOC
status: living
updated: 2026-09-18
tags: [bookflow, roadmap, moc, planning]
---

# Roadmap MOC

What exists, what is next, and how progress will be measured.

## Notes

- [[Current State Matrix]] - the single source of truth for verified versus planned
- [[Backlog P0-P1-P2]] - prioritized work, merged from the project planning documents
- [[Future Features MOC]] - spec-ready designs for larger capabilities
- [[Success Metrics]] - measurable outcomes and current baselines
- [[Library and Reading Stats]] - persistent library, continuity, garden
- [[TTS Synchronization]] - speech locked to the focus rail
- [[PWA Offline]] - manifest, service worker, durable local storage
- [[Concept Graph]] - cross-chapter definition linking

## Priority order

```text
Now       Resume card, session recap, benchmark numbers for import speed
Next      Library plus durable storage, annotation export and import
Later     PWA install, TTS synchronization, concept graph
Deferred  Social layer, ambient WebGL, native wrappers
```

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

## Status vocabulary

Use exactly these words when describing capability:

| Word | Meaning |
| --- | --- |
| Verified | Confirmed against source and runtime |
| Partial | Implemented with a stated scope limit |
| Planned | Designed, not implemented |
| Exploratory | Under consideration, no commitment |

Detail: [[Ethical Guardrails]], [[Competitor Analysis]], [[Verification Checklist]].