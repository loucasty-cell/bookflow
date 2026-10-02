---
title: Library and Reading Stats
type: feature
status: partial
updated: 2026-10-02
tags: [bookflow, library, stats, goals, achievements, partial]
source-files: [src/features/library/index.js, src/features/library/lib/libraryStore.js, src/features/library/lib/librarySelectors.js, src/features/library/lib/readingSpeed.js, src/features/library/lib/readingStats.js, src/features/library/lib/readingGoals.js, src/features/library/lib/achievements.js, src/features/library/lib/durableStorage.js, src/features/library/hooks/useReadingSession.js, src/features/library/components/ResumeCard.jsx, src/features/library/components/SessionRecap.jsx, src/features/library/components/BadgeGallery.jsx, src/features/library/components/RecentShelf.jsx, src/features/library/components/BadgeGlyph.jsx, src/components/AppLandingView.jsx, src/features/landing/components/LandingPage.jsx, src/features/widgets/components/WidgetGrid.jsx, src/features/reader/config.js, src/shared/lib/storage.js]
---

# Library and Reading Stats

The metadata library, session recording, resume surface, measured reading speed, opt-in goals, and
deterministic achievements are built. What is missing is exactly one thing: **file handles are not
persisted**, so resume is honest about a missing file rather than pretending to reopen it.

Status: **partial**, and the reason is specific rather than vague.

## What is missing, stated exactly

| Missing | Consequence |
| --- | --- |
| File-handle persistence and reuse | Resume requires the reader to re-select the source file. `RecentShelf` and `ResumeCard` exist precisely because automatic reopen is not possible |
| Note search across documents | Notes remain per-document; there is no consolidated notes index |
| Automatic reopen without re-selection | The reader cannot land in a book from a cold start with zero interaction |

Everything else described below is implemented. There is no statistics **dashboard**: the surfaces
are a resume card, a recent shelf, a session recap, and a badge gallery, three of which are opt-in.

## What the library stores, and what it does not

The library persists **metadata plus measured session totals**. It never stores book text.

```text
Storage key   bookflow:library
Version       LIBRARY_VERSION = 1
Entry cap     MAX_LIBRARY_ENTRIES = 60, evicted oldest by lastOpenedAt
Finished at   FINISHED_PROGRESS = 98
Shelves       SHELVES = { reading, finished, to-read }
```

Exports from `libraryStore.js`: `FINISHED_PROGRESS`, `LIBRARY_STORAGE_KEY`, `LIBRARY_VERSION`,
`MAX_LIBRARY_ENTRIES`, `SHELVES`, `addToReadQueue`, `clearLibrary`, `documentIdForFile`,
`enforceCap`, `emptyLibrary`, `getEntries`, `getEntry`, `getResumeEntry`, `normalizeEntry`,
`readLibrary`, `recordSession`, `removeEntry`, `setShelf`, `upsertEntry`.

| Rule | Reason |
| --- | --- |
| Metadata and session totals only, never text | Privacy invariant, [[Invariants]] |
| Bounded at 60 entries, evicted oldest by `lastOpenedAt` | Deterministic eviction |
| Versioned; an unknown version reads as empty rather than throwing | A schema change must not corrupt existing entries |
| Safe storage via `getSafeStorage()` | Private browsing degrades gracefully |

`documentIdForFile` derives identity from `filename:size:lastModified`, which is why re-parsing a
changed file produces a different id and therefore a different library entry.

Detail: [[Storage and Persistence]], [[Privacy Model]].

## The four surfaces and their default flags

Defaults live in `DEFAULT_SETTINGS` at `src/features/reader/config.js:17-24`:

| Surface | Component | Setting | Default | Enforced at |
| --- | --- | --- | --- | --- |
| Resume card | `components/ResumeCard.jsx` | `showResumeCard` | **`true`** | `AppLandingView.jsx:52` returns `null` when false |
| Recent shelf | `components/RecentShelf.jsx` | none | rendered | `LandingPage.jsx:14,:217` |
| Session recap | `components/SessionRecap.jsx` | `showSessionRecap` | **`false`** | `useReadingSession.js:82` only produces a recap when true and `wordsRead >= MIN_RECAP_WORDS` |
| Badge gallery | `components/BadgeGallery.jsx` | `showAchievements` | **`false`** | `AppLandingView.jsx:77,:80` |

So the calm default reading experience shows a resume card and a recent shelf, and shows neither a
session recap nor achievements unless the reader opts in. The session recap gate is a word threshold
as well as a flag, so enabling it still does not produce a recap after a two-paragraph session.

`RecentShelf` receives `onSelect` and `onLocateFile`. `WidgetGrid` at
`src/features/widgets/components/WidgetGrid.jsx:52,:56` listens for a `bookflow:library-change` window
event to refresh.

Barrel note: `library/index.js:102-105` exports `BadgeGallery`, `RecentShelf`, `ResumeCard`, and
`SessionRecap` only. `BadgeGlyph` and its `GLYPHS` export are **not** in the barrel; `BadgeGallery`
imports it internally. Do not document `BadgeGlyph` as part of the public API.

## Selectors

`librarySelectors.js` is the presentation layer over the store. It is exported from the barrel.

| Export | Role |
| --- | --- |
| `clampProgress` | Constrains a stored progress value into `0..100` |
| `formatProgress` | Human-readable progress string |
| `formatLastOpened` | Relative or absolute last-opened label |
| `hasReopenableSource` | Whether an entry claims a source the reader can act on |
| `selectContinueReading` | The entry a resume card should show |
| `selectRecent` | Recent entries for the shelf |
| `selectFinished` | Entries at or past `FINISHED_PROGRESS` |
| `selectToRead` | The read queue |

`hasReopenableSource` exists because file handles are not persisted, so an entry can be openable in
principle and still have no retrievable source.

## Measured reading speed

`readingSpeed.js` is built, not an open TODO. It measures pace from real reading rather than
assuming a constant.

| Export | Line | Value or role |
| --- | --- | --- |
| `DEFAULT_WORDS_PER_MINUTE` | `:7` | `230` |
| `MIN_MEASURED_WORDS_PER_MINUTE` | `:8` | `60` |
| `MAX_MEASURED_WORDS_PER_MINUTE` | `:9` | `900` |
| `IDLE_GAP_MS` | `:12` | `45000` |
| `MIN_SAMPLES_FOR_CONFIDENCE` | `:15` | `3` |
| `createSpeedTracker` | `:17` | Stateful tracker over active reading time |
| `computeWordsPerMinute` | `:58` | WPM from `activeMs` and `words`, clamped |
| `blendPace` | `:74` | Blends a new measurement with the previous pace |
| `minutesForWords` | `:86` | Word totals to minutes |

`IDLE_GAP_MS` is how idle time is excluded: a gap longer than 45 seconds ends an active reading
interval. `MIN_SAMPLES_FOR_CONFIDENCE` is why the pace is not reported from a single sample.

The two pace constants differ deliberately. The reader's own `estimateReadingMs` in
`readingController.js:36` defaults to 220 wpm for a *per-paragraph* duration estimate, while the
library measures 230 wpm as the *default assumption* when no measured pace exists. Neither is
presented as the reader's real speed once enough samples exist.

## Statistics

`readingStats.js` exports `getLibraryStats`, `getShelfCounts`, and `getTotals`.

| Statistic | Definition | State |
| --- | --- | --- |
| Words read | Accumulated from measured paragraph activity | Implemented |
| Time reading | Intervals with real navigation or scroll activity, idle excluded | Implemented |
| Sessions | Open to close with measured words and activity | Implemented |
| Books finished | Documents reaching `FINISHED_PROGRESS` of 98 | Implemented |
| Continuity by distinct day | Distinct days read in the last 7 and 30 | Not implemented; streak metrics are rejected |
| Reading speed | Measured WPM with idle excluded | Implemented |

Rules:

- Never count idle or background time as reading.
- Never inflate a word count from progress percentage alone without a paragraph-level check.
- Never decay, reset, or penalize for absence.

Detail: [[Ethical Guardrails]].

## Gentle continuity, not streaks

| Present | Never present |
| --- | --- |
| "4 of the last 7 days" | "Streak broken" |
| "Your weekly average is 32 minutes" | Countdown to protect a number |
| "3rd session this week" | Guilt after a gap |
| Neutral rest days | Penalty states |

## Goals

`readingGoals.js`, stored under `bookflow:goals`, `GOALS_VERSION = 1`.

| Export | Role |
| --- | --- |
| `DEFAULT_ANNUAL_TARGET` | `12` |
| `MIN_ANNUAL_TARGET` / `MAX_ANNUAL_TARGET` | `1` / `500` |
| `readGoals`, `writeGoals`, `clearGoals`, `emptyGoals`, `normalizeGoals` | Storage, versioned so an unknown version reads as empty |
| `rollOverIfNeeded` | Starts a new annual period |
| `getGoalProgress`, `goalMessage` | Progress and neutral phrasing |
| `setAnnualTarget`, `setGoalsEnabled` | Writes |

Gating: `enableAnnualGoal` defaults to `false` and `annualGoalTarget` defaults to `12`
(`config.js:23-24`). Goals are opt-in twice over: the stored `enabled` flag and the reader setting.

## Achievements

`achievements.js` exports `BADGES`, `MOTIFS`, `countNightSessions`, `evaluateAchievements`,
`evaluateBadge`, `findNewlyEarned`, `getBadgeDefinition`, and `isNightHour`.

Awarded badges persist separately under `bookflow:awarded-badges`, declared as `AWARDED_BADGES_KEY`
in `useReadingSession.js:11` rather than in `achievements.js`. The evaluation module is pure and
takes the persisted set as an argument: `findNewlyEarned(stats, alreadyAwarded)` (`:197`) filters out
anything already awarded, which is what makes a badge announce itself exactly once.

Gating: `showAchievements` defaults to `false` (`config.js:20`).

## Durable storage adapter

`durableStorage.js` is a durable adapter for large objects. **Its presence does not mean document
text is currently persisted** through it.

| Fact | Line |
| --- | --- |
| IndexedDB `DB_NAME` | `bookflow-durable` |
| `DB_VERSION` | `1` |
| Stores | `DOCUMENTS` and `UNITS`, both `keyPath: 'key'` |
| OPFS fallback directory | `bookflow-units` via `navigator.storage.getDirectory()` (`:137-138`) |

Exports: `DB_NAME`, `DB_VERSION`, `STORES`, `clearAllDurable`, `clearDocumentUnits`,
`getDurableKind`, `getDurableStore`, `isDurableStorageAvailable`, `loadDocument`, `loadDocumentUnit`,
`resetDurableStoreCache`, `saveDocument`, `saveDocumentUnit`.

There are two backends behind one interface: IndexedDB where available, and the Origin Private File
System where it is not. `isDurableStorageAvailable` is the honest gate. `getDurableKind` reports
which one is active, so a caller never has to assume.

## Implementation notes

| Concern | Approach |
| --- | --- |
| Where the library lives | `src/features/library/` with a public `index.js`; other features import from there, never from `lib/` internals |
| Landing integration | `LandingPage.jsx` renders `RecentShelf`; `ResumeCard` is the resume surface |
| Cross-feature refresh | A `bookflow:library-change` window event, not a shared store subscription |
| Versioning | `version` checked on read; unknown versions ignored rather than thrown |
| Migration | Merge over defaults, consistent with the settings store pattern |
| File handle reuse | Not implemented. The resume flow asks the reader to re-select the file |
| Tests | Store, selectors, speed, stats, goals, achievements, and durable adapter are unit tested; component tests use `renderToStaticMarkup` because the project has no DOM test environment installed |

## Acceptance criteria

- [x] Library persists metadata and session totals only, with no document text.
- [ ] Resume reaches the exact restored position without re-parsing when the file is available.
      Blocked on file-handle persistence.
- [ ] Missing file produces a clear, actionable message and re-selection path. Partially met:
      `hasReopenableSource` and `onLocateFile` exist, but the reopen itself is not implemented.
- [x] Statistics never count idle or background time.
- [x] No penalty or decay mechanic exists anywhere.
- [x] Entry count is bounded with deterministic eviction.
- [x] Unknown schema versions do not crash on read.
- [x] Recent shelf renders on the landing page.
- [ ] Recent shelf and resume verified at 320px, 390x844, and desktop in a browser run.

Related: [[Success Metrics]], [[Feature Spec Template]], [[Architecture MOC]], [[Home Widgets]].