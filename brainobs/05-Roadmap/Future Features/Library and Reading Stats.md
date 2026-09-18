---
title: Library and Reading Stats
type: spec
status: planned
updated: 2026-09-18
tags: [bookflow, roadmap, library, stats, planned]
source-files: [detailsinfo.md, goals.md, src/shared/lib/storage.js, src/features/reader/config.js]
---

# Library and Reading Stats

Planned. A persistent library and honest reading statistics. This closes the single largest gap
in the retention design: today, once a book is closed, there is no surface that brings it back.

Status: **planned**. The documentation currently states there is no persistent library or
recent-books screen.

## Why this is the top feature

```text
Without a library:  reader must remember the file, find it, and re-import it
With a library:     reader taps continue and lands exactly where they stopped
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
Component   src/features/landing/components/ResumeCard.jsx
Content     Title, chapter label, progress percent, last opened
Action      Continue, landing on the exact restored position
Fallback    Hidden with no library entries. Never an empty shell.
Edge case   If the source file is unavailable, say so plainly and
            offer re-selection instead of failing silently.
```

## Reading statistics

| Statistic | Definition | Honest? |
| --- | --- | --- |
| Words read | Accumulated from actual progress deltas | Yes |
| Time reading | Intervals with real navigation or scroll activity | Yes, with idle time excluded |
| Sessions | Open to close, above a minimum duration | Yes |
| Continuity | Distinct days read in the last 7 and 30 | Yes |
| Books finished | Documents reaching a completion threshold | Yes |

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
| Where the library lives | New feature folder `src/features/library/` with a public `index.js` |
| Landing integration | `LandingPage` consumes the library through its public API only |
| Versioning | `version` field checked on read; unknown versions ignored rather than thrown |
| Migration | Merge over defaults, consistent with the settings store pattern |
| File handle reuse | Feature-detect the File System Access API, fall back to re-selection |
| Tests | Store logic, eviction, version handling, and stats math all unit tested |

Detail: [[File Placement Map]], [[Frontend Architecture]].

## Acceptance criteria

- [ ] Library persists metadata only, with no document text.
- [ ] Resume reaches the exact restored position without re-parsing when the file is available.
- [ ] Missing file produces a clear, actionable message.
- [ ] Statistics never count idle or background time.
- [ ] No penalty or decay mechanic exists anywhere.
- [ ] Entry count is bounded with deterministic eviction.
- [ ] Unknown schema versions do not crash on read.
- [ ] Verified at 320px, 390x844, and desktop with no overflow.

Related: [[Future Features MOC]], [[Success Metrics]], [[Feature Spec Template]].