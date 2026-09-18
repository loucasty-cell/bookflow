---
title: Atomic Habits Framework
type: strategy
status: living
updated: 2026-09-18
tags: [bookflow, psychology, habits, strategy, atomic-habits]
source-files: [goals.md, features.md, Bookflowideas.md, reactUIUXcover.md, src/features/reader/config.js, src/App.jsx]
---

# Atomic Habits Framework

James Clear's four laws, translated from a general habit model into concrete Bookflow
implementation. Each law gets the principle, what exists today, and a build spec an agent can
implement.

The framework is used as a design lens, not as permission to manipulate. Where a law's most
effective version conflicts with the calm-reader invariants, Bookflow takes the ethical version
and documents the trade-off.

## Law 1: Make it obvious

**Principle.** Habits are cued by environment and visibility. A behaviour that requires
hunting for an entry point decays. The cue should be unmissable and unambiguous.

**What exists today**

| Mechanism | Implementation | Effect |
| --- | --- | --- |
| Drag-and-drop intake | `.drop-card` on the landing page with format badges | Import is the visually dominant action |
| Sample book | Built-in sample opens with one click | Zero-friction first session, no file needed |
| Landing hero copy | "Read deeper. Keep going." | States the intended behaviour plainly |
| Local trust badge | "Local by design" with a shield icon | Removes the hesitation that blocks upload |
| Format badges | PDF, EPUB, TXT, MD | Answers "will my file even work?" before clicking |

**What is missing**

There is no persistent library and no resume surface on the landing page today. Once a reader
closes a book, the strongest possible cue is gone. This is the single largest gap in the habit
design.

**Build spec: Resume Card**

```text
Component   src/features/landing/components/ResumeCard.jsx
Shows       Book title, last known chapter label, progress percent, "Continue" action
Data source bookflow:document:{documentId} sessions plus stored book metadata
Placement   Above the drop card on the landing page, primary visual weight
Fallback    Hidden entirely when no session exists. Never render an empty state shell.
```

Rules: it must be a resume, not a re-import. Clicking `Continue` should land on the exact
previous reading position without re-parsing when the document is still available, and must
state plainly when the file needs to be re-selected.

**Build spec: Recent shelf**

```text
Component   src/features/landing/components/RecentShelf.jsx
Shows       Last 3 to 5 documents with title, progress, last read relative time
Storage     New bookflow:library key holding lightweight metadata only, never text
```

Metadata only: title, author, kind, size, lastModified, progress, lastOpenedAt. No content.

**Environment design rule.** The reader itself is the cleanest environment Bookflow offers.
`ReaderShell` shows only resume, chapter, progress, reader text, bookmark or note, and
settings. Every addition must justify itself against the "obvious next action" test.

Detail: [[Screen Architectures]], [[Premium Micro-interactions]].

## Law 2: Make it attractive

**Principle.** Craving precedes action. Anticipation of a specific, attainable reward is what
pulls a reader back. Vague promises do not create craving; concrete previews do.

**What exists today**

| Mechanism | Implementation | Effect |
| --- | --- | --- |
| Chapter horizon teasers | Contextual 2-line preview of upcoming narrative tension | Creates a concrete pull to continue |
| Reward capsules | `VariableRewardCapsule`, opt-in | Completion payoff with substance |
| Editorial typography | Drop caps, pull quotes, insight boxes | Makes reading feel crafted, not dumped |
| Atmosphere themes | Paper, Dusk, Tint | Emotional fit with reading context |
| Typography control | Typeface, size, tracking | Personalization creates ownership |
| Physics transitions | Framer Motion springs | Feels made, not assembled |

**Build spec: Chapter horizon teaser**

```text
Source      Derived from existing chapter structure
Placement   End of a chapter, above the completion mark
Content     Two lines maximum. Must describe something real in the next chapter.
Never       Generic filler such as "Next: more great insights"
```

If a truthful teaser cannot be produced, show nothing. A fabricated teaser teaches the reader
that the app lies, which destroys the craving mechanism permanently.

**Build spec: Reading mood presets**

```text
Presets     Morning, Deep Work, Night, Gentle on Eyes
Each maps   theme + fontSize + lineHeight + letterSpacing + focus intensity + fontFamily
Storage     Preset id plus a custom flag, in existing settings
```

This is attractiveness through identity: "how I read at night" is a more compelling cue than a
list of six sliders.

**The line not to cross.** Attractiveness comes from the substance of the book and the craft of
the experience, not from manufactured urgency or artificial scarcity.

Detail: [[Themes and Atmospheres]], [[Typography System]], [[Reward Capsules]].

## Law 3: Make it easy

**Principle.** Friction is the killer. The rule of least effort means the version of the
behaviour that requires almost nothing is the version that actually happens. The two-minute
rule: make the start trivial.

**What exists today**

This is Bookflow's strongest law, and the most defensible technical advantage.

| Mechanism | Implementation | Effect |
| --- | --- | --- |
| One-tap import | Drag-drop or click, no account, no upload | No signup wall |
| Progressive import | `importScheduler` opens the first ready unit immediately | Reader starts in seconds, not after a full scan |
| Native text fast path | Selectable pages bypass OCR entirely | Digital PDFs are effectively instant |
| Exact resume | Session restores progress, scroll, pin | No re-finding your place |
| Bounded OCR | Capped workers and batches | The tab does not freeze or crash |
| Cancellation | `AbortController` per unit, plus backend cancel | The user can always stop |
| Page-by-page progress | SSE with page numbers, word counts | Waiting is visible and quantified |
| Graceful fallback | Local to backend with disclosure | A hard document does not become a dead end |

**Why this beats larger apps.** Most PDF readers make a reader wait for the entire document
before showing anything, and freeze the tab while doing it. Opening page one of a 600 page scan
in seconds is a materially better product, and it is already built and wired.

Detail: [[Import Scheduler]], [[OCR Decision Tree]], [[Backend OCR Engine]].

**Build spec: two-minute first session**

```text
Target   From landing to reading the first paragraph in under 10 seconds, no file needed
Route    Sample book opens instantly, first paragraph focused automatically
Goal     One complete reading session before the user decides if the app is good
```

**Build spec: remember the file handle**

```text
Use      File System Access API where available
Effect   Reopening a book does not require finding the file again
Fallback Feature-detect and fall back to re-selection with a clear prompt
```

Detail: [[Library and Reading Stats]], [[Storage and Persistence]].

## Law 4: Make it satisfying

**Principle.** A behaviour is repeated when it is immediately rewarded. But the reward must not
be the mechanism itself. Satiation, not compulsion, is the goal.

**What exists today**

| Mechanism | Implementation | Effect |
| --- | --- | --- |
| Deterministic progress | `readingProgress` from position | Honest, trustworthy signal |
| Bookmark and note artifacts | Persisted per document | The session leaves something behind |
| Chapter completion mark | End of chapter affordance | A clear finish line |
| Reward capsules | Opt-in, substantive content | Completion payoff |
| Reading time estimate | 230 words per minute | Makes the remaining cost legible |
| End mark and next-book trigger | Completion of the document | Closes the loop cleanly |

**The determinism decision.** Progress is derived from reading position only. It never inflates
with time in the app, never decays to create anxiety, and never resets to punish a break. A
reader can close the app for a month and return to exactly the progress they earned. This is a
deliberate rejection of the streak-and-anxiety model that most habit apps use.

Detail: [[Ethical Guardrails]], [[Library and Reading Stats]].

**Build spec: session recap**

```text
Component   src/features/reader/components/SessionRecap.jsx
Trigger     On close, when the session exceeded a meaningful threshold
Shows       Units read, words read, time in flow, pace sparkline, one saved note
Action      Single dismiss. No share nag. No rating request. No notification opt-in.
```

The recap gives the reader evidence of progress they can feel. That evidence, not a badge, is
what makes them return.

**Build spec: gentle continuity, not streaks**

| Acceptable | Not acceptable |
| --- | --- |
| "You have read 4 of the last 7 days" | "You lost your 30 day streak" |
| "You are 12 minutes from your weekly average" | Countdown pressure to protect a streak |
| "This is your 3rd session this week" | Guilt copy after any absence |
| Rest days count neutrally | Penalizing rest |

Continuity describes reality. A streak system creates loss aversion around a number the app
invented, which is manipulation. Bookflow counts honestly and never punishes.

**Build spec: reading garden**

```text
Idea      A calm visual of accumulated reading: a growing shelf, a slowly drawn line.
Rules     Slow, quiet accumulation that grows from genuine pages read.
          No loss states. Never animated in a way that demands attention.
```

The satisfying artifact should be evidence of real reading, not a game currency.

## Applying the laws in reverse

The fourth law of behaviour change inverts each of these to break a habit. That inversion is
directly useful, because the habit Bookflow must displace is doomscrolling:

| Inverse law | Application to distraction |
| --- | --- |
| Make it invisible | The reader hides chrome and everything competing with text |
| Make it unattractive | No infinite feed, no autoplay, no algorithmic next-item surface |
| Make it difficult | Reading requires deliberate action; nothing scrolls forever on its own |
| Make it unsatisfying | No variable-ratio payout for scrolling, so scrolling loses its grip |

This is why the calm reader is not a style preference. It is the mechanism.

## Priority order

If only some of this gets built, build it in this order. The order reflects leverage, not
appeal.

```text
1  Resume Card            Restores the strongest cue, closes the biggest gap
2  Session Recap          Makes progress tangible at the exact moment of leaving
3  Recent Shelf           Multiple books become a library, not a chore
4  Mood Presets           Personalization, cheap to build from existing settings
5  Gentle continuity      Honest counts, no punishment
6  Reading garden         Accumulated evidence, quiet and long-horizon
```

## Measurement

The framework is only real if it changes measurable outcomes. Track:

- Time from landing to first paragraph read.
- Percentage of sessions that reach a second session within 7 days.
- Median session length and median completion rate per book.
- Percentage of sessions ending with a note or bookmark created.
- Return-without-reminder rate, the honest test of habit formation.

Detail: [[Success Metrics]].

Related: [[Habit Loop Design]], [[Retention Research]], [[Ethical Guardrails]], [[Competitor Analysis]].