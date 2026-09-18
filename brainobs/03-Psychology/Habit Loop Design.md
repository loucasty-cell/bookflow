---
title: Habit Loop Design
type: strategy
status: living
updated: 2026-09-18
tags: [bookflow, psychology, habit-loop, strategy]
source-files: [goals.md, Bookflowideas.md, src/features/reader/config.js]
---

# Habit Loop Design

The cue, craving, response, reward loop applied to a single reading session, and then to the
return visit.

## Session loop

| Stage | Bookflow mechanism | Design requirement |
| --- | --- | --- |
| Cue | Resume card, recent shelf, drop zone | Must be visible before any scrolling |
| Craving | Chapter teaser, capsule anticipation, mood fit | Must preview something real |
| Response | Import then scroll then focus rail | Must be low friction at every step |
| Reward | Deterministic progress, completion mark, saved note | Must be honest and immediate |

## Return loop

The session loop is not enough. What brings a reader back the next day is a different set of
signals:

```text
leave with  -> an unfished chapter, a saved note, a visible position
return to   -> the exact place, with the same typography, in one action
```

The strongest return cue is continuity. A reader who always lands exactly where they stopped
trusts the app enough to stop again. A reader who fears losing their place keeps the tab open
and never builds the habit.

## The core loop in plain language

From the project's own product thesis:

```text
Import one owned document
  -> see a clear first reading action
  -> read a stable chunk
  -> receive lightweight progress feedback
  -> remember or annotate something meaningful
  -> stop safely or continue by choice
  -> return to the exact next place
```

Every clause there is a design constraint: "stop safely" means no guilt, "return to the exact
next place" means deterministic persistence, and "by choice" means no autoplay or forced
continuation.

## Loop integrity rules

| Rule | Reason |
| --- | --- |
| Never break the response step with a wait | A slow import breaks the loop before it starts |
| Never delay the reward | Feedback at the moment of action, not at session end |
| Never make stopping feel like failure | Punished rest ends the habit |
| Never fake a cue | A teaser that lies destroys the craving stage |
| Never inflate the reward | Inflated progress makes the signal worthless |

## Where the loop can fail

| Failure | Symptom | Fix direction |
| --- | --- | --- |
| No cue on return | Reader forgets the book exists | [[Library and Reading Stats]] resume card |
| Weak craving | Nothing pulls them to open it | Chapter horizon teasers |
| Response friction | Import or resume feels slow | Progressive import, file handle reuse |
| Reward too far away | Progress invisible for a long time | Per-chapter completion marks |
| Punishing break | Guilt or lost streaks | Honest continuity, never streaks |

## Applying the loop to what is already built

| Loop stage | Already satisfied by |
| --- | --- |
| Cue | Landing intake plus sample book |
| Craving | Horizon teasers plus capsules opt-in |
| Response | Progressive import plus focus rail |
| Reward | Deterministic progress plus notes |

The gap is the return loop, and it is a library and resume problem rather than a reader problem.
That is why the Resume Card is the top priority in [[Atomic Habits Framework]].

## Measurement of loop health

- Sessions per returning reader per week.
- Median time from landing to first scroll.
- Percentage of sessions that end with a note or bookmark.
- Percentage of books read past the first chapter.

Related: [[Atomic Habits Framework]], [[Flow State Science]], [[Success Metrics]].