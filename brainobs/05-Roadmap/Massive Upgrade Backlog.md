---
title: Massive Upgrade Backlog
type: spec
status: planned
updated: 2026-09-23
tags: [bookflow, roadmap, upgrade, backlog, ui, experience]
source-files: [brainobs/05-Roadmap/Audit Compare Replan.md, brainobs/03-Psychology/Competitor Mechanics Scorecard.md, src/features/reader/config.js, src/App.jsx]
---

# Massive Upgrade Backlog

The prioritized UI and experience upgrade list produced by the competitor research and audit.
Plan only. Nothing here is implemented.

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

```text
New file    src/features/landing/components/ResumeCard.jsx
Shows       Title, chapter label, progress percent, last opened
Action      Continue, restoring the exact position
Fallback    Hidden when the library is empty. Never an empty shell
Edge case   If the file is unavailable, say so and offer re-selection
Placement   Above the drop card, primary visual weight
```

Acceptance: appears only with history; Continue lands on the restored paragraph; the missing-file
case is explained, not silent.

### 3. Currently Reading surface

```text
New file    src/features/landing/components/RecentShelf.jsx
Shows       Last 3 to 5 documents with progress and relative last-read time
Replaces    Nothing; it sits beside the curated LivingShelf
Note        The curated shelf stays, since it solves first-session cold start
```

Acceptance: the reader's own books appear alongside curated ones with clear visual distinction.

### 4. Session recap

```text
New file    src/features/reader/components/SessionRecap.jsx
Trigger     On close, when the session passed a meaningful threshold
Shows       Units read, words read, time in flow, pace sparkline, one saved note
Action      Single dismiss. No share nag, no rating request, no notification opt-in
```

Reuse the sparkline approach already designed for the reward capsule rather than a chart library.

Acceptance: derived from real activity only; no inflated numbers; single dismiss.

---

## Phase 2: progress legibility

### 5. Local reading speed

```text
New file    src/features/reader/lib/readingSpeed.js
Method      Accumulate words and elapsed active time during a session
Ignore      Idle gaps beyond a threshold, so a paused tab does not skew results
Store       Running estimate in the document session; never sent anywhere
Clamp       To a sane range so an outlier session cannot distort the estimate
Tests       readingSpeed.test.js
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

```text
Modify      src/features/reader/components/HorizonTeaser.jsx
Issue       estimatedMinutes currently defaults to a fixed 3
Fix         Compute from the next chapter's real word count and readingSpeed
```

Acceptance for Phase 2: no fabricated numbers anywhere; estimates stated only when derived.

---

## Phase 3: comprehension and annotations

### 9. Local definition lookup

```text
New file    src/features/reader/lib/dictionary.js
Source      A bundled local dictionary, loaded lazily like OCR assets
UI          Extend src/features/reader/components/SelectionTooltip.jsx with Look up
Boundary    LOCAL ONLY. A definition API call would send words off-device
Fallback    If no entry exists, say so; never silently do nothing
Dependency  Requires approval before adding any dictionary data source
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

```text
New file    src/features/library/lib/readingGoals.js
Shape       { year, targetBooks, history: string[] }
Rules       Self-set only. Recoverable. No loss state, no streak talk,
            no penalty copy, no reset-for-missing-a-day
Display     A quiet line, never a progress bar of shame
Setting     New key in src/features/reader/config.js, default off
```

This is the Goodreads Challenge model, which survives a missed week because the horizon is a year.

### 14. Derived stats, zero manual logging

```text
New file    src/features/library/lib/readingStats.js
Derives     Words read, time reading, sessions, days read, books finished
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

```text
New file    src/features/library/lib/durableStorage.js
Options     OPFS first, IndexedDB fallback
Detect      Feature-detect both, degrade with a clear message
Never       Store content somewhere the user cannot clear
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

```text
Uses        The seven bookflow: performance marks already firing
Produces    p50 and p95 for time to first readable unit per format
Reason      The strongest competitive claim is currently unmeasured
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
| 9 Local dictionary | Approve a dictionary data source |
| 18 Durable storage | Approve OPFS or IndexedDB as the mechanism |

Everything in Phases 1, 2, 3, 5, and 6 needs no invariant change and no new dependency except the
dictionary data file.

Related: [[Audit Compare Replan]], [[Competitor Mechanics Scorecard]], [[Competitor Research MOC]],
[[Roadmap MOC]], [[Backlog P0-P1-P2]].