---
title: Massive Upgrade Backlog
type: spec
status: living
updated: 2026-10-02
tags: [bookflow, roadmap, upgrade, backlog, ui, experience]
source-files: [brainobs/05-Roadmap/Audit Compare Replan.md,brainobs/03-Psychology/Competitor Mechanics Scorecard.md,src/features/reader/config.js,src/features/reader/components/HorizonTeaser.jsx,src/features/reader/lib/dictionary.js,src/features/reader/lib/readingController.js,src/features/reader/lib/progressLabel.js,src/features/library/index.js,src/features/library/components/RecentShelf.jsx,src/features/library/lib/libraryStore.js,src/features/library/lib/readingGoals.js,src/features/library/lib/readingStats.js,src/features/library/lib/readingSpeed.js,src/features/library/lib/durableStorage.js,src/App.jsx,playwright.config.js,tests/e2e/lens-bar.spec.js]
---

# Massive Upgrade Backlog

The prioritized UI and experience upgrade list produced by the competitor research and audit.
This is a historical build specification. Current implementation status is maintained in
[[Backlog P0-P1-P2]] and [[Current State Matrix]]; an item's original `New file` label does not
mean that file is absent today.

Ordering follows the audit phases. Each item names the exact location, the acceptance check, and
the invariant it must respect. No item requires a new dependency unless stated.

## Status summary, re-measured 2026-10-02

| Item | Status | Anchor |
| --- | --- | --- |
| 1 Library store | Built | `libraryStore.js` |
| 2 Resume Card | Built, file re-selection | `ResumeCard.jsx` |
| 3 Currently Reading | **Shipped since the last revision** | `RecentShelf.jsx` |
| 4 Session recap | Built, opt-in | `SessionRecap.jsx` |
| 5 Local reading speed | Built | `readingSpeed.js` |
| 6 Time left in chapter | **Shipped since the last revision** | `progressLabel.js` |
| 7 Unit position | Partially verified, no page concept | `progressLabel.js` |
| 8 HorizonTeaser | Partial, derived estimate only | `TODO(backlog-8 follow-up)` |
| 9 Local dictionary | Partial, starter lexicon | `dictionary.js` |
| 10 Look-back | Open | `TODO(backlog-10)` |
| 11 Note consolidation | Partial, search shipped | no marker |
| 12 Annotation bundle | Partial, PDF export only | no marker |
| 13 Annual goal | Built, opt-in | `readingGoals.js` |
| 14 Derived stats | Built | `readingStats.js` |
| 15 Gentle continuity | Not started, and only opt-in | rejected as a default |
| 16 Reading moods | Open | `TODO(backlog-16)` |
| 17 PWA | Open | `TODO(backlog-17)` in `index.html` |
| 18 Durable storage | Adapter only, lifecycle unwired | `durableStorage.js` |
| 19 Auto night theme | Open | `TODO(backlog-19)` |
| 20 Haptic suppression | Open | `TODO(backlog-20)` |
| 21 Column sorting | Open | `TODO(backlog-21)` |
| 22 Orphaned `resonance.css` | Resolved, file deleted | no marker |
| 23 Unused haptic patterns | Open | `TODO(backlog-23)` |
| 24 Import benchmarks | Partial, one probe | `TODO(backlog-24)` |

Gate counts on the same date: `npm run lint` 0 errors plus 1 warning, `npm test` 52 test files and
506 passing tests, `npm run build` succeeds with chunk-size and `INEFFECTIVE_DYNAMIC_IMPORT`
warnings, `pytest backend/tests/` 75 passed, and `npx playwright test --list` 19 tests in 4 specs.
CI runs lint, test, build, and pytest only.

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

Status: shipped on 2026-10-02 as `src/features/library/components/RecentShelf.jsx`. It is exported
from `src/features/library/index.js` and rendered by `LandingPage.jsx:217`. No `backlog-3` marker
remains anywhere in source.

```text
Component   src/features/library/components/RecentShelf.jsx
Shows       Last 3 to 5 documents with progress and relative last-read time
Replaces    Nothing; it sits beside the curated LivingShelf
Note        The curated shelf stays, since it solves first-session cold start
Fallback    Each row can prompt for the source file, because the handle is not retained
Tests       src/features/library/components/RecentShelf.test.jsx
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
Verified exports on 2026-10-02: `createSpeedTracker`, `computeWordsPerMinute`, `blendPace`,
`minutesForWords`, `DEFAULT_WORDS_PER_MINUTE = 230`, `MIN_MEASURED_WORDS_PER_MINUTE = 60`,
`MAX_MEASURED_WORDS_PER_MINUTE = 900`, `IDLE_GAP_MS = 45000`, `MIN_SAMPLES_FOR_CONFIDENCE = 3`.

```text
Component   src/features/library/lib/readingSpeed.js
Method      Accumulate words and elapsed active time during a session
Ignore      Idle gaps beyond a threshold, so a paused tab does not skew results
Store       Derived from local activity; never sent anywhere
Clamp       To a sane range so an outlier session cannot distort the estimate
Tests       src/features/library/lib/readingStats.test.js
```

### 6. Time left in chapter

Status: shipped. The label lives in `src/features/reader/lib/progressLabel.js`, which returns
`N min left`, or `null` when it cannot be known. The `backlog-6` marker in `ReaderPage.jsx` no
longer exists.

```text
Component   src/features/reader/lib/progressLabel.js
Uses        readingSpeed estimate plus remaining chapter words
Display     "12 min left" beside percent
Fallback    Hold the estimate back until MIN_SAMPLES_FOR_CONFIDENCE samples exist
```

### 7. Unit position, not fabricated pages

Status: partially verified. `progressLabel.js` states the rule in its own header comment: the reader
has no page concept and never fabricates a page number. Its `PROGRESS_DISPLAY_MODES` are exactly
`percent`, `time-left-chapter`, and `hidden`, defaulting to `percent`. A `Chapter X of Y` header
string was not located in source, so the unit-position half of this item is still unverified.

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

Status: open. `src/features/reader/components/LookBackPanel.jsx` does not exist. The work is
anchored by a live `TODO(backlog-10)` marker at `src/features/reader/components/ContentsPanel.jsx:4`.

```text
New file    src/features/reader/components/LookBackPanel.jsx
Shows       Chapter and heading map with the current position marked
Reuses      Existing chapter data; no new parsing
Never       3D page-flip animation, and never animate the reading column
```

### 11. Note consolidation view

Status: partial. The `backlog-11` marker no longer exists in `NotesPanel.jsx` because the search
half shipped: the panel holds a `searchQuery` state, filters notes by both text and quote, and
renders a `Search session notes` input with an `aria-label`. Cross-chapter consolidation and a
jump-to-quote action were not located and remain unverified.

```text
Modify      src/features/reader/components/NotesPanel.jsx
Adds        All notes across chapters in one list with search and jump-to-quote
Reason      Kindle My Notebook is the closest analogue, and it is the switching cost
```

### 12. Annotation export and import

Status: partial. One-way per-document PDF export is built
(`src/features/reader/lib/notesPdfExport.js` and `notesExport.js`). The versioned round-trippable
bundle is not: `src/features/library/lib/annotationBundle.js` does not exist, and there is no live
marker for it. The old `backlog-12` marker in `NotesPanel.jsx` is gone.

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

Status: open. The `TODO(backlog-16)` marker is live at `src/features/reader/config.js:25`, and the
target file `src/features/reader/lib/readingMoods.js` does not exist.

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

Status: open. Anchored by the `TODO(backlog-17)` comment at `index.html:74`. No manifest or service
worker is committed.

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

Status: open. The `TODO(backlog-19)` marker is live at `src/features/reader/config.js:29`.

```text
Modify      src/features/reader/lib/readingMoods.js or a small prefers-color-scheme hook
Behavior    Follow the OS preference when the reader opts in
Never       Flip the theme mid-paragraph without warning
```

### 20. Haptic suppression under reduced motion

Status: open. The `TODO(backlog-20)` marker is live at `src/shared/lib/haptics.js:6`.

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

Status: open. The `TODO(backlog-21)` marker is live at
`src/features/document-import/lib/pdfParser.js:95`.

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
Status      RESOLVED - deleted. No importer, and its only two custom properties
            (--text-muted, --bookflow-blue) exist nowhere in the token layer.
            Social styling is not designed yet, so the file was dead weight.
```

### 23. Wire or retire unused haptic patterns

Status: open. The `TODO(backlog-23)` marker is live at `src/shared/lib/haptics.js:27` and names
HEAVY, WARNING, and SELECTION.

```text
File        src/shared/lib/haptics.js
Unused      HEAVY, WARNING, SELECTION
Action      Wire SELECTION to text selection, or mark the set as reserved in a doc line
```

### 24. Publish import benchmark numbers

Status: partial. The seven `bookflow:` marks are firing, and one 420-page browser probe measured
`3.7 s`; repeated p50/p95 numbers by format and device are still open. The `TODO(backlog-24)` marker
is live at `src/shared/lib/perfMarks.js:34`. Note that CI builds but never asserts a size, so no
bundle or timing budget is enforced remotely.

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

## Decisions still blocking

| Item | Needs |
| --- | --- |
| 13 Annual goal | Settled: opt-in via `enableAnnualGoal`, default off, recoverable, no streak language |
| 15 Continuity counts | Confirm reject, or opt-in only |
| 9 Local dictionary | Approve a licensed data source; starter lexicon is already wired |
| 18 Durable storage | Adapter exists; approve and wire the document lifecycle |
| 12 Annotation bundle | No `TODO` marker exists. Add one at the Notes export action so the item stays findable |

Everything in Phases 1, 2, 3, 5, and 6 needs no invariant change and no new dependency except the
dictionary data file.

Related: [[Audit Compare Replan]], [[Competitor Mechanics Scorecard]], [[Competitor Research MOC]],
[[Roadmap MOC]], [[Backlog P0-P1-P2]].