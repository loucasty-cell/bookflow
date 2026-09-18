---
title: Backlog P0-P1-P2
type: reference
status: living
updated: 2026-09-18
tags: [bookflow, roadmap, backlog, priorities]
source-files: [Bookflowideas.md, improvements.md, goals.md, scripts/bench.md]
---

# Backlog P0-P1-P2

Prioritized work merged from the project planning documents. Order reflects risk reduction and
leverage, not appeal.

## P0: highest leverage

| Item | Why it is P0 | Status |
| --- | --- | --- |
| Manifest-first progressive import | Unblocks first readable content | Built and wired |
| Native text detection before OCR | Accuracy, speed, privacy | Built |
| Cancellable bounded OCR queue | Prevents frozen tabs and runaway work | Built |
| Stable unit and paragraph anchors | Required by bookmarks and notes | Built |
| OPFS or IndexedDB storage adapter | Large books must survive a session | Open |
| OCR confidence and failure UI | Unreadable pages must be visible | Partial |
| Long-book and scanned-PDF tests | Reliability on the hardest inputs | Open |
| Import speed benchmarks published | The strongest claim is unmeasured | Open |

Detail: [[Import Scheduler]], [[Storage and Persistence]], [[Success Metrics]].

## P1: high value

| Item | Why | Status |
| --- | --- | --- |
| Resume card on landing | Restores the strongest habit cue | Open |
| Recent books shelf | Multiple books need a library, not a chore | Open |
| Session recap | Completes the satisfying stage of the loop | Open |
| Look-back drawer | Reading back is a core failure mode today | Open |
| Tesseract worker fallback cleanup | Resource hygiene on long scans | Open |
| PaddleOCR small and medium profiles | Self-hosted quality tiers | Built in Docker workflow |
| Annotation export and import | Portability across devices | Open |
| Text-to-speech synchronization | Accessibility and comprehension support | Open |
| Deterministic session goals | Honest, non-punitive targets | Open |
| Recall prompts from notes | Makes saved notes useful later | Open |

Detail: [[Future Features MOC]], [[Notes and Bookmarks]].

## P2: polish

| Item | Why | Status |
| --- | --- | --- |
| Chapter progress visualization | Makes position legible at a glance | Open |
| Optional local semantic search | Search inside a book without a server | Open |
| Device-specific performance tuning | Match work to device class | Partial |
| Three.js ambient layer | Atmosphere only, never for text | Exploratory |
| Native mobile wrapper after PWA | Only after PWA is validated | Open |
| Multi-column layout sorting | Removes a real fidelity gap | Open |
| Local ONNX quantized OCR | Air-gapped environments | Open |

Detail: [[Premium Micro-interactions]], [[PWA Offline]], [[OCR Decision Tree]].

## Explicit non-goals for now

| Non-goal | Reason |
| --- | --- |
| Cloud sync | Privacy position and complexity |
| Account system | Blocks the zero-friction import path |
| Bookstore or catalog | Losing fight against store readers |
| Recommendation feed | Contradicts the calm-reader model |
| Streak punishment | Against the ethical guardrails |
| Framework rewrite | Effort better spent on reliability |

Source: `improvements.md` explicitly advises against a rewrite, cloud AI before document
reliability is solved, rendering text in WebGL, unmeasured performance claims, processing every
page at once, and sacrificing a layout-preserving fallback.

Detail: [[Ethical Guardrails]], [[Competitor Analysis]].

## How to prioritize a new idea

```text
1  Does it improve reading correctness or reliability?     -> P0 candidate
2  Does it close the return loop or reduce friction?       -> P1 candidate
3  Does it improve perceived quality without new risk?     -> P2 candidate
4  Does it conflict with an invariant or guardrail?        -> reject or reshape
5  Does it need a new dependency?                          -> require approval first
```

## Sequencing note

The unglamorous order in the improvement analysis, preserved here because it is correct:

```text
1  Progressive import and OCR scheduler with cancellation
2  Durable storage plus reliable anchors
3  End-to-end, accessibility, and performance quality gates
4  Root component and state decomposition
5  OCR confidence plus a benchmark corpus
6  Calm reader polish and optional atmosphere work
```

Items 1 is done. Items 2 and 3 are the current frontier.

Related: [[Current State Matrix]], [[Roadmap MOC]], [[Success Metrics]].