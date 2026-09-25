---
title: Audit Compare Replan
type: strategy
status: living
updated: 2026-09-25
tags: [bookflow, audit, compare, replan, strategy]
source-files: [brainobs/09-Competitor Research/Competitor Research MOC.md, brainobs/03-Psychology/Competitor Mechanics Scorecard.md, src/features/reader/config.js, src/features/reader/lib/dictionary.js, src/features/reader/components/HorizonTeaser.jsx, src/features/document-import/hooks/useDocumentImport.js, src/features/library/index.js, src/features/library/lib/readingGoals.js, src/features/library/lib/readingStats.js, src/App.jsx]
---

# Audit Compare Replan

Bookflow audited capability by capability against the researched competitors, then replanned.
This note is a strategy snapshot. For current implementation status, [[Current State Matrix]] is
authoritative.

## Verdict summary

| Dimension | Bookflow today | Category leader | Verdict |
| --- | --- | --- | --- |
| Reading experience core | Focus rail, bionic salience, haptics | Kindle, Apple Books | **Ahead** |
| Import of arbitrary files | 4 formats, local-first, progressive | None of them match this | **Ahead** |
| Scanned and damaged PDFs | 2-tier local OCR plus backend | Kindle handles owned purchases only | **Ahead** |
| Privacy | Local by default, no account | None | **Ahead** |
| Library and return loop | Metadata library and resume card; recent shelf and automatic reopen remain open | Kindle, Apple, Goodreads | **Partial** |
| Reading legibility over time | Metadata stats and opt-in goals exist; recent shelf remains open | Apple Books, Goodreads | **Partial** |
| Progress fidelity | Percent only | Kindle percent plus page plus time left | **Behind** |
| Comprehension aids | Local starter dictionary is wired behind an opt-in Define action; licensed dataset and look-back remain open | Kindle dictionary, X-Ray, translation | **Partial** |
| Social layer | None | Goodreads, Fable | **Behind, intentionally** |
| Annotation depth | Notes, bookmarks, quotes, tooltip | Kindle Notebook, Libby | **Parity, close** |
| Themes and typography | 5 themes, 4 fonts, 3 trackings | Apple Books themes | **Parity** |
| Offline | Not PWA | All | **Behind** |
| Sync | None | All | **Behind, intentionally** |

## Where Bookflow is genuinely ahead

These are not opinions. They follow from the architecture.

### 1. Arbitrary local files with no account

Kindle requires an Amazon account and a purchase or subscription. Apple Books needs an Apple
account. Everand needs a subscription. Libby needs a library card. Goodreads needs an account.

Bookflow reads a PDF, EPUB, TXT, or Markdown file from the reader's disk with no account and no
upload on the default path. **No competitor in the research set does this.** The optional backend
is reached only after an explicit user-started accelerated scan.

That is the single strongest differentiator and it currently gets one line of landing copy.

### 2. Progressive processing on hard documents

Bookflow's PDF path processes bounded units through `importScheduler` with cancellation and honest
progress, but the app waits for terminal `100%` before opening the reader. This is not a
pre-terminal reader opening claim. EPUB, TXT, and Markdown currently use the blocking parser.

Detail: [[Import Scheduler]].

### 3. Two-tier OCR on documents the competitor never sees

Local Tesseract for scanned pages, then an optional self-hosted backend with page-level SSE
progress, exactly-once settlement, and reported skipped pages. Kindle offers none of this for
files the reader already owns.

Detail: [[OCR Decision Tree]], [[OCR-Frontend Sync Contract]].

### 4. Comprehension ergonomics no competitor ships

| Feature | Status |
| --- | --- |
| Golden-ratio focus rail at 0.38 | Built, and unique in the research set |
| Scroll intent accumulation | Built, prevents jitter |
| Syntactic salience bionic fixation | Built, uses a low-salience particle set |
| Paragraph classification heuristic | Built in `src/shared/lib/text.js` |
| Haptic feedback vocabulary | Built and wired in `FocusCard` and `SelectionTooltip` |

None of the researched apps place the active unit at a golden-ratio line with intent-gated
scrolling. This is the actual product innovation.

## Where Bookflow is behind, and why it hurts

### 1. The return loop is partial

Bookflow now has a metadata-only `bookflow:library`, session statistics, a `ResumeCard`, and a
close-of-session recap. The reader can see an in-progress title and request the source file again.
The recent-books shelf, file-handle reuse, and automatic reopen without re-selection are still
missing, so the return loop is not yet equivalent to a competitor's library.

Evidence: `src/features/library/lib/libraryStore.js`, `ResumeCard.jsx`, and the `backlog-3`
`RecentShelf` TODO in `LandingPage.jsx`.

Detail: [[Library and Reading Stats]].

### 2. Progress is less legible than Kindle's

| Kindle provides | Bookflow provides |
| --- | --- |
| Percent read | Percent read |
| Real page numbers | Not available |
| Time left in chapter, from actual reading speed | Local measured speed exists in the library feature, but the reader does not yet surface chapter time-left |
| Time left in book | Whole document estimate only |

`createSpeedTracker` and `computeWordsPerMinute` now measure active local reading, with idle gaps
excluded. The remaining gap is presentation and sample confidence, not the absence of a speed
calculation.

### 3. Comprehension aids are partial

Bookflow has a local starter dictionary, an opt-in `Define` action in `SelectionTooltip`, and a
licensed-data seam. Unknown words produce an honest miss instead of a network request. The missing
pieces are a full licensed dataset, look-back, and richer study tools.

Boundary: any lookup must remain local. A dictionary API call would send the selected word
off-device.

### 4. Legibility over time is partial

Goodreads succeeds on shelves, a yearly count, and what friends read. Apple Books ships goals,
streaks, and a yearly count. Bookflow now has opt-in local goals, measured stats, and deterministic
achievement APIs, but no complete statistics dashboard or recent-books shelf.

### 5. Not installable, not offline-capable

Every competitor is an installed app. Bookflow is a web app with no manifest and no service
worker. Ironically the parsing and OCR assets are already fully local, so Bookflow would be more
offline-capable than most competitors once the PWA layer exists.

Detail: [[PWA Offline]].

## Deliberate disadvantages, kept on purpose

These are behind by design and should not be "fixed" without an explicit decision.

| Gap | Reason kept |
| --- | --- |
| No sync | Local-first; adding a server for user data changes the privacy position |
| No catalog or store | Bookflow reads the reader's own files |
| No social feed | Infinite scroll competes with reading |
| No streaks by default | Loss aversion around an invented number |
| No recommendations | Requires the content surveillance the model forbids |
| No accounts | Blocks the zero-friction import path |

Full reasoning: [[Ethical Guardrails]], [[Competitor Mechanics Scorecard]].

## Freshly discovered facts from this audit

These corrections were made in the vault during this audit and matter for planning.

| Discovery | Impact |
| --- | --- |
| Haptic vocabulary is **built and wired**, not partial | Removes an item from the backlog |
| Paragraph classification is **implemented** in `src/shared/lib/text.js` | Removes an item; status changes to verified |
| `HorizonTeaser` is **built and wired** in `ReaderPage` | The craving mechanism already exists; its fallback estimate is derived from the next chapter's word count, while live speed samples remain open |
| `FocusCard.jsx` exists as a separate focus surface | Affects UI refactor scoping |
| `resonance.css` exists in reader components but is **orphaned**, no importer | Dead asset; either wire it to social resonance or delete it |
| `HAPTIC_PATTERNS.HEAVY`, `WARNING`, `SELECTION` defined but **unused** | Either wire or mark reserved |

The `resonance.css` finding is confirmed: no file imports it, and `ReaderPage.jsx` does not
reference resonance styles. It is either unfinished social-layer styling or leftover work.

## Replan

The replan reorders the upgrade path around what the competitor research proved matters.

### Phase 1: close the return loop

```text
Priority 1  Recent books shelf plus file reopen   highest remaining reading value
Priority 2  Currently Reading surface             what Goodreads and Apple Books lead with
Priority 3  Want to Read queue                    present in almost every competitor
Priority 4  Session recap on close                built; keep it opt-in
```

Rationale: every researched app that retains readers does these four. Bookflow now has the
metadata library, resume card, and opt-in recap, but still lacks the recent shelf and file-handle
reopen.

### Phase 2: match Kindle on progress legibility

```text
Priority 5  Measure real local reading speed
Priority 6  Time left in chapter from that speed
Priority 7  Unit count plus percent, no fake page mapping
Priority 8  HorizonTeaser estimated from real word count
```

### Phase 3: close the comprehension gap

```text
Priority 9   Bundled local dictionary lookup
Priority 10  Lightweight look-back or skim surface
Priority 11  Note consolidation view (My Notebook equivalent)
Priority 12  Annotation export and import bundles
```

### Phase 4: legibility over time, opt-in

```text
Priority 13  Annual local reading goal, recoverable, no loss state
Priority 14  Derived stats with zero manual logging
Priority 15  Optional gentle continuity counts, never streaks by default
Priority 16  Reading moods bundling theme plus typography
```

### Phase 5: reach parity on delivery

```text
Priority 17  PWA manifest and service worker
Priority 18  Durable storage for large documents
Priority 19  Auto night theme
Priority 20  Haptic suppression under reduced motion
```

### Phase 6: reader ergonomics debt

```text
Priority 21  Multi-column PDF layout sorting
Priority 22  Resolve the orphaned resonance.css
Priority 23  Wire or retire unused haptic patterns
Priority 24  Publish import benchmark numbers
```

## Measurement for the replan

State the metric before building, per [[Success Metrics]].

| Phase | Metric |
| --- | --- |
| 1 | Share of sessions followed by another within 7 days |
| 2 | Accuracy of the time-left estimate versus actual session length |
| 3 | Lookups per 1000 words read; abandonment after a lookup |
| 4 | Readers who set a goal; goal completion without reminders |
| 5 | Offline session success rate; install conversion after a completed session |
| 6 | Long-task count over 100 ms; median import time per format |

## The rebuild question

Answering it directly: **no rebuild is needed.** The audit found a strong, differentiated reader
with a partial return loop and a missing legibility layer. The remaining work is additive,
metadata-first, and does not require moving parsing, OCR, or focus systems.

The architecture is not the constraint. The return loop is.

Detail: [[Massive Upgrade Backlog]], [[Backlog P0-P1-P2]], [[Competitor Mechanics Scorecard]].

Related: [[Competitor Research MOC]], [[Current State Matrix]], [[Atomic Habits Framework]].