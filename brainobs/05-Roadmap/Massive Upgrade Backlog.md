---
title: Massive Upgrade Backlog
type: spec
status: living
updated: 2026-09-25
tags: [bookflow, roadmap, upgrade, backlog, ui, experience]
source-files: [brainobs/05-Roadmap/Audit Compare Replan.md, brainobs/03-Psychology/Competitor Mechanics Scorecard.md, src/features/reader/config.js, src/features/reader/components/HorizonTeaser.jsx, src/features/reader/lib/dictionary.js, src/features/library/index.js, src/features/library/lib/libraryStore.js, src/features/library/lib/readingGoals.js, src/features/library/lib/readingStats.js, src/features/library/lib/durableStorage.js, src/App.jsx]
---

# Massive Upgrade Backlog

The prioritized UI and experience upgrade list produced by the competitor research and audit.
This is a historical build specification. Current implementation status is maintained in
[[Backlog P0-P1-P2]] and [[Current State Matrix]]; an item's original `New file` label does not
mean that file is absent today.

Ordering follows the audit phases. Each item names the exact location, the acceptance check, and
the invariant it must respect. No item requires a new dependency unless stated.

## Quick reference

| Phase | Items | Theme |
| --- | --- | --- |
| 1 | 1 to 4 | Close the return loop |
| 2 | 5 to 8 | Progress legibility |
| 3 | 9 to 12 | Comprehension and annotations |
| 4 | 13 to 16 | Legibility over time |
| 5 | 17 to 20 | Delivery parity |
| 6 | 21 to 24 | Ergonomics debt |

---

## Phase 1: close the return loop

### 1. Library store

Status: built in `src/features/library/lib/libraryStore.js`; metadata only and bounded.

```text
New file    src/features/library/lib/libraryStore.js
Storage key bookflow:library
Shape       { version: 1, entries: LibraryEntry[] }
Entry       { documentId, title, author, kind, size, lastModified,
              progress, activeChapter, lastOpenedAt }
Rules       Metadata only, never text. Bounded entry count with eviction
            by lastOpenedAt. Uses getSafeStorage. Unknown version ignored.
Tests       src/features/library/lib/libraryStore.test.js
```

Export the public surface from `src/features/library/index.js`. Do not import from another
feature's internals; consume the public API.

Acceptance: entry written on open, updated on close, no document text in storage, bounded growth.

### 2. Resume Card

Status: built in `src/features/library/components/ResumeCard.jsx`; the current app action is
file re-selection, not automatic handle reuse.

```text
Component   src/features/library/components/ResumeCard.jsx
Shows       Title, chapter label, progress percent, last opened
Action      Re-select the source file; the session position is restored after import
Fallback    Hidden when there is no honest in-progress entry. Never an empty shell
Edge case   Do not claim automatic reopen until file-handle reuse is wired
Placement   Above the landing intake when a resume entry exists
```

Acceptance: appears only with an honest in-progress entry and explains the re-selection action.

### 3. Currently Reading surface

```text
New file    src/features/landing/components/RecentShelf.jsx
Shows       Last 3 to 5 documents with progress and relative last-read time
Replaces    Nothing; it sits beside the curated LivingShelf
Note        The curated shelf stays, since it solves first-session cold start
```

Acceptance: the reader's own books appear alongside curated ones with clear visual distinction.

### 4. Session recap

Status: built in `src/features/library/components/SessionRecap.jsx`; opt-in through
`showSessionRecap`.

```text
Component   src/features/library/components/SessionRecap.jsx
Trigger     On close, when the session passed a meaningful threshold
Shows       Words read, time in flow, notes, bookmarks, and optional pace samples
Action      Single dismiss. No share nag. No rating request. No notification opt-in
```

Acceptance: derived from real activity only; no inflated numbers; single dismiss.

---

## Phase 2: progress legibility

### 5. Local reading speed

Status: built in `src/features/library/lib/readingSpeed.js`; consumed by measured session totals.

```text
Component   src/features/library/lib/readingSpeed.js
Method      Accumulate words and elapsed active time during a session
Ignore      Idle gaps beyond a threshold, so a paused tab does not skew results
Store       Derived from local activity; never sent anywhere
Clamp       To a sane range so an outlier session cannot distort the estimate
Tests       readingStats.test.js
```

### 6. Time left in chapter

```text
Modify      src/features/reader/components/ReaderPage.jsx progress area
Uses        readingSpeed estimate plus remaining chapter words
Display     "12 min left in this chapter" beside percent
Fallback    Fixed 220 WPM until enough samples exist, and only show the estimate
            once it is meaningful
```

### 7. Unit position, not fabricated pages

```text
Modify      ReaderPage progress area
Display     "Chapter 4 of 12" plus paragraph position within the chapter
Never       Invent a page number the document does not have
```

### 8. HorizonTeaser real estimate

Status: partial. The teaser is wired and derives a fallback estimate from the next chapter's word
count; live `readingSpeed` integration remains open.

```text
Component   src/features/reader/components/HorizonTeaser.jsx
Current     Derived word-count estimate at 230 WPM until live samples are available
Next        Prefer the measured readingSpeed when enough samples exist
```

Acceptance for Phase 2: no fabricated numbers anywhere; estimates stated only when derived.

---

## Phase 3: comprehension and annotations

### 9. Local definition lookup

Status: partial. The local starter lexicon and opt-in `Define` action are wired; a licensed full
dataset is not yet bundled.

```text
Component   src/features/reader/lib/dictionary.js
Source      Bundled starter lexicon; optional licensed JSON loader
UI          src/features/reader/components/SelectionTooltip.jsx with opt-in Define
Boundary    LOCAL ONLY. A definition API call would send words off-device
Fallback    If no entry exists, say so; never silently do nothing
Dependency  No new dependency; licensed data requires explicit approval
```

### 10. Look-back or skim surface

```text
New file    src/features/reader/components/LookBackPanel.jsx
Shows       Chapter and heading map with the current position marked
Reuses      Existing chapter data; no new parsing
Never       3D page-flip animation, and never animate the reading column
```

### 11. Note consolidation view

```text
Modify      src/features/reader/components/NotesPanel.jsx
Adds        All notes across chapters in one list with search and jump-to-quote
Reason      Kindle My Notebook is the closest analogue, and it is the switching cost
```

### 12. Annotation export and import

```text
Future file src/features/library/lib/annotationBundle.js
Format      Versioned JSON: documentId, title, progress, bookmarks, notes with quotes
Reuses      The existing backend shape in backend/app/models/reader.py: ExportPayload
Note        The backend already validates notes export and import; reuse that contract
```

Acceptance for Phase 3: no lookup leaves the device; notes searchable and jumpable; bundle is
versioned and documented.

---

## Phase 4: legibility over time, opt-in

### 13. Annual reading goal

Status: built in `src/features/library/lib/readingGoals.js`; opt-in and without a complete landing
dashboard.

```text
Component   src/features/library/lib/readingGoals.js
Shape       Versioned annual target, enabled flag, and history
Rules       Self-set only. Recoverable. No loss state, no streak talk,
            no penalty copy, no reset-for-missing-a-day
Display     Quiet derived progress when the surface is wired
Setting     `enableAnnualGoal`, default off
```

This is the Goodreads Challenge model, which survives a missed week because the horizon is a year.

### 14. Derived stats, zero manual logging

Status: built in `src/features/library/lib/readingStats.js`; session and gallery surfaces are
opt-in, and a full stats dashboard remains planned.

```text
Component   src/features/library/lib/readingStats.js
Derives     Words read, time reading, sessions, notes, bookmarks, books finished
Sources     Real navigation and scroll activity only
Never       Count idle or background time. Never inflate from percent alone
Never       Ask the reader to log what they read
```

### 15. Gentle continuity, never a streak by default

```text
Modify      readingGoals.js and the recap surface
Shows       "4 of the last 7 days", "3rd session this week"
Never       "Streak broken", countdowns, guilt after a gap, freeze purchases
Default     Off. This is the user decision recorded in the scorecard
```

### 16. Reading moods

```text
New file    src/features/reader/lib/readingMoods.js
Presets     Morning, Deep Work, Night, Gentle on Eyes
Each maps   theme + fontFamily + fontSize + lineHeight + letterSpacing + focus
Storage     Preset id plus a custom flag, in existing settings
Reason      Apple Books bundles fonts with themes; this is the Bookflow equivalent
```

Acceptance for Phase 4: every item off by default; nothing punitive exists anywhere; all stats
derived from real activity.

---

## Phase 5: delivery parity

### 17. PWA manifest and service worker

```text
New files   public/manifest.webmanifest, a service worker
Precache    App shell, vendor chunks, OCR worker and WASM assets
Never       Cache document files or backend API responses
Prompt      Install offered only after a completed session, permanently dismissible
Detail      Full spec in [[PWA Offline]]
```

### 18. Durable storage for large documents

Status: adapter built; document lifecycle wiring remains open.

```text
Component   src/features/library/lib/durableStorage.js
Options     OPFS first, IndexedDB fallback, memory fallback for tests/unsupported browsers
Detect      Feature-detect both, degrade with a clear message
Never       Claim that document persistence is active before the lifecycle is wired
```

### 19. Auto night theme

```text
Modify      src/features/reader/lib/readingMoods.js or a small prefers-color-scheme hook
Behavior    Follow the OS preference when the reader opts in
Never       Flip the theme mid-paragraph without warning
```

### 20. Haptic suppression under reduced motion

```text
Modify      src/shared/lib/haptics.js
Rule        Check prefers-reduced-motion inside triggerHaptic and no-op when set
Reason      Currently ungated, which violates the reduced-motion invariant for touch users
```

Acceptance for Phase 5: reads offline; documents never cached by the service worker; reduced
motion suppresses haptics.

---

## Phase 6: ergonomics debt

### 21. Multi-column PDF layout sorting

```text
Modify      src/features/document-import/lib/pdfParser.js line assembly
Goal        Eliminate column interleaving in two-column PDFs
Method      Spatial sorting on x and y rather than y alone
```

### 22. Resolve the orphaned `resonance.css`

```text
File        src/features/reader/components/resonance.css
Finding     No importer exists anywhere in src/
Action      Either wire it to [[Social Resonance]] when that work starts, or delete it
```

### 23. Wire or retire unused haptic patterns

```text
File        src/shared/lib/haptics.js
Unused      HEAVY, WARNING, SELECTION
Action      Wire SELECTION to text selection, or mark the set as reserved in a doc line
```

### 24. Publish import benchmark numbers

Status: partial. The seven `bookflow:` marks are firing, and one 420-page browser probe measured
`3.7 s`; repeated p50/p95 numbers by format and device are still open.

```text
Uses        src/shared/lib/perfMarks.js
Produces    p50 and p95 for terminal import-to-reader time per format
Reason      One probe is not a performance baseline
```

Acceptance for Phase 6: columns ordered correctly; no orphaned assets; no dead exports; published
numbers with a date.

---

## Cross-cutting rules for every item

| Rule | Consequence |
| --- | --- |
| Metadata only in any new store | Never persist document text |
| Default off for anything behavioral | Matches the calm-reader invariant |
| No new dependency without approval | Dictionary data and OPFS are the only likely needs |
| Reduced motion respected | Including haptics |
| Reduced transparency respected | Blur never required for legibility |
| Derived, never logged | Stats come from real reading |
| No fabricated numbers | No invented pages, streaks, or estimates |
| Token-driven styling | Reuse [[Design Tokens]] |
| MOC link for every new note | Keeps the vault navigable |

## Decisions blocking Phase 4

| Item | Needs |
| --- | --- |
| 13 Annual goal | Confirm the horizon and whether it is opt-in |
| 15 Continuity counts | Confirm reject, or opt-in only |
| 9 Local dictionary | Approve a licensed data source; starter lexicon is already wired |
| 18 Durable storage | Adapter exists; approve and wire the document lifecycle |

Everything in Phases 1, 2, 3, 5, and 6 needs no invariant change and no new dependency except the
dictionary data file.

Related: [[Audit Compare Replan]], [[Competitor Mechanics Scorecard]], [[Competitor Research MOC]],
[[Roadmap MOC]], [[Backlog P0-P1-P2]].