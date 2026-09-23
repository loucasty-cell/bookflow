---
title: Audit Compare Replan
type: strategy
status: living
updated: 2026-09-23
tags: [bookflow, audit, compare, replan, strategy]
source-files: [brainobs/09-Competitor Research/Competitor Research MOC.md, brainobs/03-Psychology/Competitor Mechanics Scorecard.md, src/features/reader/config.js, src/App.jsx]
---

# Audit Compare Replan

Bookflow audited capability by capability against the researched competitors, then replanned.
Plan only. No production code changed by this note.

## Verdict summary

| Dimension | Bookflow today | Category leader | Verdict |
| --- | --- | --- | --- |
| Reading experience core | Focus rail, bionic salience, haptics | Kindle, Apple Books | **Ahead** |
| Import of arbitrary files | 4 formats, local-first, progressive | None of them match this | **Ahead** |
| Scanned and damaged PDFs | 2-tier local OCR plus backend | Kindle handles owned purchases only | **Ahead** |
| Privacy | Local by default, no account | None | **Ahead** |
| Library and return loop | Static curated shelf only | Kindle, Apple, Goodreads | **Behind** |
| Reading legibility over time | No library, no goals, no stats | Apple Books, Goodreads | **Behind** |
| Progress fidelity | Percent only | Kindle percent plus page plus time left | **Behind** |
| Comprehension aids | None in-book | Kindle dictionary, X-Ray, translation | **Behind** |
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

Bookflow reads a PDF, EPUB, TXT, or Markdown file from the reader's disk with no account, no
upload, and no network. **No competitor in the research set does this.**

That is the single strongest differentiator and it currently gets one line of landing copy.

### 2. Progressive import on hard documents

Every researched app prepares a whole book before showing it, and can block on a large scanned
file. Bookflow opens the first ready unit immediately via `importScheduler`, with bounded
concurrency and real cancellation.

Detail: [[Import Scheduler]].

### 3. Two-tier OCR on documents the competitor never sees

Local Tesseract for scanned pages, then an optional self-hosted backend with page-level SSE
progress, exactly-once settlement, and reported skipped pages. Kindle offers none of this for
files the reader already owns.

Detail: [[OCR Decision Tree]], [[OCR-Frontend Sync Contract]].

### 4. Comprehension ergonomics no competitor ships

| Feature | Status |
| --- | --- |
| Golden-ratio focus rail at 0.42 | Built, and unique in the research set |
| Scroll intent accumulation | Built, prevents jitter |
| Syntactic salience bionic fixation | Built, uses a low-salience particle set |
| Paragraph classification heuristic | Built in `src/shared/lib/text.js` |
| Haptic feedback vocabulary | Built and wired in `FocusCard` and `SelectionTooltip` |

None of the researched apps place the active unit at a golden-ratio line with intent-gated
scrolling. This is the actual product innovation.

## Where Bookflow is behind, and why it hurts

### 1. The return loop is missing entirely

The most damaging gap. Bookflow has `bookflow:document:{documentId}` sessions that store progress,
bookmarks, notes, and scroll position, but there is **no library index and no resume surface**.

Consequence: after closing a book, the reader must find the file and import it again. Every
competitor solves this. Kindle auto-syncs purchases; Apple Books shows Reading Now; Goodreads has
Currently Reading.

Evidence: no `bookflow:library` key exists in code. Verified by search across `src/`.

Detail: [[Library and Reading Stats]].

### 2. Progress is less legible than Kindle's

| Kindle provides | Bookflow provides |
| --- | --- |
| Percent read | Percent read |
| Real page numbers | Not available |
| Time left in chapter, from actual reading speed | Reading time from a fixed 220 WPM, whole document |
| Time left in book | Whole document estimate only |

`estimateReadingMs` in `readingController.js` uses a fixed `wordsPerMinute = 220` and a
900 to 8000 ms clamp. It does not learn the reader's real speed. Kindle's personalized estimate is
a genuinely better feature and it is a small addition here.

### 3. No comprehension aids

Kindle's dictionary lookup, X-Ray, Wikipedia, and instant translation are the strongest
abandonment reducers in the category, especially for non-fiction and translated works. Bookflow has
the selection tooltip infrastructure (`SelectionTooltip.jsx`) already positioned correctly. The
missing piece is a local definition source.

Boundary: any lookup must be local or explicitly opt-in. A dictionary API call would send the
selected word off-device.

### 4. No legibility over time

Goodreads succeeds on shelves, a yearly count, and what friends read. Apple Books ships goals,
streaks, and a yearly count. Bookflow has deterministic progress and nothing that accumulates.
Nothing in the app answers "what have I read this year?"

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
| `HorizonTeaser` is **built and wired** in `ReaderPage` | The craving mechanism already exists |
| `FocusCard.jsx` exists as a separate focus surface | Affects UI refactor scoping |
| `resonance.css` exists in reader components but is **orphaned**, no importer | Dead asset; either wire it to social resonance or delete it |
| `HAPTIC_PATTERNS.HEAVY`, `WARNING`, `SELECTION` defined but **unused** | Either wire or mark reserved |

The `resonance.css` finding is confirmed: no file imports it, and `ReaderPage.jsx` does not
reference resonance styles. It is either unfinished social-layer styling or leftover work.

## Replan

The replan reorders the upgrade path around what the competitor research proved matters.

### Phase 1: close the return loop

```text
Priority 1  Library index plus Resume Card        highest reading value in the audit
Priority 2  Currently Reading surface             what Goodreads and Apple Books lead with
Priority 3  Want to Read queue                    present in almost every competitor
Priority 4  Session recap on close                completes the satisfying stage
```

Rationale: every researched app that retains readers does these four. Bookflow does none.

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
with a missing library and a missing legibility layer. Both are additive, both are metadata only,
and neither touches the parsing, OCR, or focus systems.

The architecture is not the constraint. The return loop is.

Detail: [[Massive Upgrade Backlog]], [[Backlog P0-P1-P2]], [[Competitor Mechanics Scorecard]].

Related: [[Competitor Research MOC]], [[Current State Matrix]], [[Atomic Habits Framework]].