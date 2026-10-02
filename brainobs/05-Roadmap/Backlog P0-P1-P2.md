---
title: Backlog P0-P1-P2
type: reference
status: living
updated: 2026-10-02
tags: [bookflow, roadmap, backlog, priorities]
source-files: [Bookflowideas.md,improvements.md,goals.md,scripts/bench.md,tests/e2e/long-import.spec.js,src/features/document-import/hooks/useDocumentImport.js,src/features/library/components/RecentShelf.jsx,src/features/library/lib/readingSpeed.js,src/features/reader/lib/progressLabel.js,src/features/reader/config.js,src/shared/lib/haptics.js,src/shared/lib/perfMarks.js,index.html]
---

# Backlog P0-P1-P2

Prioritized work merged from the project planning documents. Order reflects risk reduction and
leverage, not appeal.

## P0: highest leverage

| Item | Why it is P0 | Status |
| --- | --- | --- |
| Manifest-first progressive import | Bounds work while preserving order | Built; app waits for terminal 100% before opening the reader |
| Native text detection before OCR | Accuracy, speed, privacy | Built |
| Cancellable bounded OCR queue | Prevents frozen tabs and runaway work | Built |
| Stable unit and paragraph anchors | Required by bookmarks and notes | Built |
| OPFS or IndexedDB storage adapter | Large books must survive a session | Built (`durableStorage.js`, OPFS first) |
| OCR confidence and failure UI | Unreadable pages must be visible | Partial |
| Long-book and scanned-PDF tests | Reliability on the hardest inputs | Partial: 420-page browser probe verified; scanned-PDF integration still open |
| Import speed benchmarks published | The strongest claim is not yet a p50/p95 baseline | Partial: one 3.7s probe measured |

Detail: [[Import Scheduler]], [[Storage and Persistence]], [[Success Metrics]].

## P1: high value

| Item | Why | Status |
| --- | --- | --- |
| Resume card on landing | Restores the strongest habit cue | Built (`ResumeCard.jsx`) |
| Recent books shelf | Multiple books need a library, not a chore | Built (`RecentShelf.jsx`, exported from `library/index.js`, rendered by `LandingPage.jsx`). No `backlog-3` marker remains |
| Session recap | Completes the satisfying stage of the loop | Built (`SessionRecap.jsx`) |
| Look-back drawer | Reading back is a core failure mode today | Open |
| Tesseract worker cleanup | Resource hygiene on long scans | Built in the local OCR scheduler; repeated long-scan profiling remains open |
| PaddleOCR small and medium profiles | Self-hosted quality tiers | Built in Docker workflow |
| Annotation export and import | Portability across devices | Partial: per-document PDF export is built (`notesPdfExport.js`, `notesExport.js`). The versioned round-trippable bundle is not; `src/features/library/lib/annotationBundle.js` does not exist |
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

Items 1, the reader input/session decomposition, the recent books shelf, chapter time-left, note
search, and the 420-page browser probe are done. The current frontier is repeated performance
measurement, scanned-PDF integration, file-handle reopen, and the PWA layer.

## Code TODO footprints

Every genuinely open item has a `TODO(backlog-N)` marker at its integration point in source, so the
next session starts at the exact file. Re-derive this table with:

```bash
Get-ChildItem -Recurse -Path src -Include *.js,*.jsx | Select-String -Pattern 'TODO\(backlog'
Select-String -Path index.html -Pattern 'backlog'
```

Verified against source on 2026-10-02: **8** `TODO(backlog-N)` markers inside `src/` and **1** in
`index.html`, **9** in total.

| Marker | File and line | Work |
| --- | --- | --- |
| `backlog-10` | `src/features/reader/components/ContentsPanel.jsx:4` | LookBackPanel chapter/heading map with position marked |
| `backlog-8 follow-up` | `src/features/reader/components/HorizonTeaser.jsx:18` | Prefer live readingSpeed over the current derived 230 WPM estimate |
| `backlog-16` | `src/features/reader/config.js:25` | Reading moods presets in a new `src/features/reader/lib/readingMoods.js`, which does not exist yet |
| `backlog-19` | `src/features/reader/config.js:29` | Opt-in auto night theme from `prefers-color-scheme` |
| `backlog-20` | `src/shared/lib/haptics.js:6` | Reduced-motion gate inside `triggerHaptic` |
| `backlog-21` | `src/features/document-import/lib/pdfParser.js:95` | Spatial x/y column sorting with the two-column fixture |
| `backlog-23` | `src/shared/lib/haptics.js:27` | Wire or reserve the unused HEAVY, WARNING, and SELECTION patterns |
| `backlog-24` | `src/shared/lib/perfMarks.js:34` | Publish p50/p95 import benchmarks with a date; one 420-page probe exists |
| `backlog-17` | `index.html:74` | PWA manifest plus service worker, never cache documents |

One non-`backlog` marker also exists and is tracked here for completeness:

| Marker | File and line | Work |
| --- | --- | --- |
| `improvements-gap-4` | `src/features/reader/hooks/useReaderPersistence.js:55` | Quote-hash anchors plus a repair report |

## Markers that used to be claimed here and are not real

These rows were carried in earlier revisions of this note. Each claim was checked against source on
2026-10-02 and each one was false, in two different ways.

| Marker | Claimed in | Reality on 2026-10-02 | Correct status |
| --- | --- | --- | --- |
| `backlog-3` | `src/features/landing/components/LandingPage.jsx` | No such marker. The feature it named shipped: `RecentShelf.jsx` exists, is exported from `src/features/library/index.js`, and is rendered at `LandingPage.jsx:217` | Built |
| `backlog-6` | `src/features/reader/components/ReaderPage.jsx` | No such marker. The feature it named shipped: `src/features/reader/lib/progressLabel.js` renders `N min left` from `readingSpeed.js` | Built |
| `backlog-11` | `src/features/reader/components/NotesPanel.jsx` | No such marker, and the feature shipped: `NotesPanel.jsx` holds a `searchQuery` state, filters notes by text and quote, and renders a `Search session notes` input with an `aria-label` | Built |
| `backlog-12` | `src/features/reader/components/NotesPanel.jsx` | No such marker, and the feature did **not** ship: `src/features/library/lib/annotationBundle.js` does not exist | Still open, no marker. Track it here until a marker is added |
| `backlog-22` | `src/features/reader/components/resonance.css` | Resolved. The file was deleted and has no importer | Closed |

Lesson for the next revision: a marker table is only trustworthy if it was re-derived from source in
the same pass that published it. Three of the five rows above were aspirational, not measured.

Already built, no marker needed: backlog 1, 2, 4, 5, 7, 8 (base), 9, 13, 14, 18.
`18` is an adapter only; wiring document persistence and file-handle reopen remain open.
Explicitly rejected per guardrails: backlog 15 continuity/streaks (no streak talk).

Related: [[Current State Matrix]], [[Roadmap MOC]], [[Success Metrics]].