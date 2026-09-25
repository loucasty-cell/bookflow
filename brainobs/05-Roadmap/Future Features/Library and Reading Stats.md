---
title: Library and Reading Stats
type: spec
status: partial
updated: 2026-09-25
tags: [bookflow, roadmap, library, stats, partial]
source-files: [detailsinfo.md, goals.md, src/App.jsx, src/features/library/index.js, src/features/library/hooks/useReadingSession.js, src/features/library/lib/libraryStore.js, src/features/library/lib/readingStats.js, src/features/library/lib/readingGoals.js, src/features/library/lib/achievements.js, src/features/library/lib/durableStorage.js, src/features/library/components/ResumeCard.jsx, src/features/library/components/SessionRecap.jsx, src/features/library/components/BadgeGallery.jsx, src/shared/lib/storage.js, src/features/reader/config.js]
---

# Library and Reading Stats

Partial. The metadata library, session recording, resume card, session recap, opt-in goals, and
deterministic achievements now exist. Stats, goals, and achievements are exposed through the
library feature; the landing surface currently shows the resume card and optional milestone gallery,
not a complete statistics dashboard. The recent-books shelf, file-handle reuse, automatic reopen
without re-selection, and durable document persistence remain open.

## Why this is the top feature

```text
Without a library:  reader must remember the file, find it, and re-import it
With a complete library: reader taps continue and lands exactly where they stopped
```

The second version converts a multi-step task with friction into a single action with none.
That is what makes a daily habit possible.

Detail: [[Atomic Habits Framework]], [[Habit Loop Design]].

## The library

```text
Storage key   bookflow:library
Shape         { version, entries: [ LibraryEntry ] }
Entry         { documentId, title, author, kind, size, lastModified,
                progress, activeChapter, lastOpenedAt, coverHint }
```

Rules:

| Rule | Reason |
| --- | --- |
| Metadata only, never text | Privacy invariant |
| Bounded size | Cap at a fixed entry count, evict oldest by `lastOpenedAt` |
| Versioned | Schema changes must not corrupt existing entries |
| Safe storage | Uses `getSafeStorage()` so private browsing degrades gracefully |

Detail: [[Storage and Persistence]], [[Privacy Model]].

## Resume surface

```text
Component   src/features/library/components/ResumeCard.jsx
Content     Title, chapter label, progress percent, last opened
Action      Re-select the source file; the session position is restored after import
Fallback    Hidden with no honest in-progress entry. Never an empty shell.
Edge case   The card must not claim automatic reopen or re-parsing until file-handle reuse is wired.
```

## Reading statistics

| Statistic | Definition | Current state |
| --- | --- | --- |
| Words read | Accumulated from measured paragraph activity | Implemented |
| Time reading | Intervals with real navigation or scroll activity | Implemented, idle time excluded |
| Sessions | Open to close with measured words and activity | Implemented |
| Continuity | Distinct days read in the last 7 and 30 | Planned; streak metrics are rejected |
| Books finished | Documents reaching a completion threshold | Implemented at 98% |

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

Detail: [[Atomic Habits Framework]].

## Reading garden

```text
Idea      A quiet visual of accumulation: a slowly drawn line, a growing shelf
Growth    Driven by genuine pages read
Motion    Static by default; never animated to demand attention
Reduced   Fully static under reduced motion
```

Loss states are prohibited. A garden that can wilt would reintroduce the punishment mechanic the
guardrails forbid.

## Implementation notes

| Concern | Approach |
| --- | --- |
| Where the library lives | `src/features/library/` with a public `index.js` |
| Landing integration | `App.jsx` renders `ResumeCard`; a recent shelf remains open |
| Versioning | `version` field checked on read; unknown versions ignored rather than thrown |
| Migration | Merge over defaults, consistent with the settings store pattern |
| File handle reuse | Planned; current resume flow asks the reader to re-select the file |
| Tests | Store, stats, goals, achievements, and durable adapter unit tested |

Detail: [[File Placement Map]], [[Frontend Architecture]].

## Acceptance criteria

- [x] Library persists metadata only, with no document text.
- [ ] Resume reaches the exact restored position without re-parsing when the file is available.
- [ ] Missing file produces a clear, actionable message and re-selection path.
- [x] Statistics never count idle or background time.
- [x] No penalty or decay mechanic exists anywhere.
- [x] Entry count is bounded with deterministic eviction.
- [x] Unknown schema versions do not crash on read.
- [ ] Recent shelf, file-handle reuse, and automatic reopen are verified at 320px, 390x844, and desktop.

Related: [[Future Features MOC]], [[Success Metrics]], [[Feature Spec Template]].