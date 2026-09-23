---
title: Backlog P0-P1-P2
type: reference
status: living
updated: 2026-09-23
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
| OPFS or IndexedDB storage adapter | Large books must survive a session | Built (`durableStorage.js`, OPFS first) |
| OCR confidence and failure UI | Unreadable pages must be visible | Partial |
| Long-book and scanned-PDF tests | Reliability on the hardest inputs | Open |
| Import speed benchmarks published | The strongest claim is unmeasured | Open |

Detail: [[Import Scheduler]], [[Storage and Persistence]], [[Success Metrics]].

## P1: high value

| Item | Why | Status |
| --- | --- | --- |
| Resume card on landing | Restores the strongest habit cue | Built (`ResumeCard.jsx`) |
| Recent books shelf | Multiple books need a library, not a chore | Open, TODO footprint in `LandingPage.jsx` (backlog-3) |
| Session recap | Completes the satisfying stage of the loop | Built (`SessionRecap.jsx`) |
| Look-back drawer | Reading back is a core failure mode today | Open |
| Tesseract worker fallback cleanup | Resource hygiene on long scans | Open |
| PaddleOCR small and medium profiles | Self-hosted quality tiers | Built in Docker workflow |
| Annotation export and import | Portability across devices | Open |
| Text-to-speech synchronization | Accessibility and comprehension support | Open |
| Deterministic session goals | Honest, non-punitive targets | Built (`readingGoals.js`, opt-in, no streaks) |
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

## Code TODO footprints

Every open item above (plus the validated backlog) has a `TODO(backlog-N)` marker at
its integration point in source, so the next session starts at the exact file. Map,
verified against source on 2026-09-23:

| Marker | File | Work |
| --- | --- | --- |
| `backlog-3` | `src/features/landing/components/LandingPage.jsx` | RecentShelf: last 3-5 library entries beside LivingShelf |
| `backlog-6` | `src/features/reader/components/ReaderPage.jsx` | Time left in chapter from readingSpeed, 220 WPM fallback |
| `backlog-8 follow-up` | `src/features/reader/components/HorizonTeaser.jsx` | Prefer live readingSpeed over fixed 230 WPM divisor |
| `backlog-10` | `src/features/reader/components/ContentsPanel.jsx` | LookBackPanel chapter/heading map with position marked |
| `backlog-11`, `backlog-12` | `src/features/reader/components/NotesPanel.jsx` | Note search + jump-to-quote; versioned annotation bundle |
| `backlog-16`, `backlog-19` | `src/features/reader/config.js` | readingMoods presets; opt-in auto night theme |
| `backlog-17` | `index.html` | PWA manifest + service worker, never cache documents |
| `backlog-20`, `backlog-23` | `src/shared/lib/haptics.js` | Reduced-motion gate; wire or reserve unused patterns |
| `backlog-21` | `src/features/document-import/lib/pdfParser.js` | Spatial x/y column sorting with two-column fixture |
| `backlog-22` | `src/features/reader/components/resonance.css` | Wire orphaned stylesheet or delete it |
| `backlog-24` | `src/shared/lib/perfMarks.js` | Publish p50/p95 import benchmarks with a date |
| `improvements-gap-4` | `src/features/reader/hooks/useReaderPersistence.js` | Quote-hash anchors + repair report |

Already built, no marker needed: backlog 1, 2, 4, 5, 7, 8 (base), 9, 13, 14, 18.
Explicitly rejected per guardrails: backlog 15 continuity/streaks (no streak talk).

Related: [[Current State Matrix]], [[Roadmap MOC]], [[Success Metrics]].