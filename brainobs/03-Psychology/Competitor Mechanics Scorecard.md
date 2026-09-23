---
title: Competitor Mechanics Scorecard
type: strategy
status: living
updated: 2026-09-23
tags: [bookflow, competitor, scorecard, decision, mechanics]
source-files: [brainobs/09-Competitor Research/Competitor Research MOC.md, brainobs/03-Psychology/Ethical Guardrails.md]
---

# Competitor Mechanics Scorecard

Every mechanic found across the competitor research, scored against Bookflow's invariants. This
is the decision table requested for the 80%-inspiration plan. Each mechanic gets a verdict, a
reading-value rating, and the invariant it touches.

## Scoring dimensions

| Dimension | Question |
| --- | --- |
| Reading value | Does it make the reader read more, or just open the app more? |
| Invariant fit | Does it conflict with local-first, calm-by-default, or deterministic progress? |
| Effort | Small, medium, or large to implement well |
| Dependency | Does it need a new package or a server? |

## Reading-value scale

| Rating | Meaning |
| --- | --- |
| Direct | Provably reduces friction or abandonment for the act of reading |
| Indirect | Supports continuity or memory of reading |
| Neutral | Records reading but does not change it |
| Competing | Pulls attention away from the open book |

## Verdict legend

| Verdict | Meaning |
| --- | --- |
| Adopt | Build it. Fits invariants, direct reading value |
| Adapt | Build a modified version that fits the invariants |
| Defer | Decide later, with a named blocker |
| Opt-in | Only behind an explicit setting, default off |
| Reject | Do not build. Conflicts with the product position |

## Tier 1: adopt outright

| Mechanic | Source | Value | Invariant fit | Effort | Verdict |
| --- | --- | --- | --- | --- | --- |
| Persistent library with resume | Kindle, Apple, Libby, Goodreads | Direct | Clean, metadata only | Medium | **Adopt** |
| Want to Read queue | Libby, Goodreads, Apple | Indirect | Clean, metadata only | Small | **Adopt** |
| Currently Reading surface | Goodreads, Apple Reading Now | Direct | Clean | Small | **Adopt** |
| Session recap on close | None directly; habit loop gap | Direct | Clean, no inflation | Small | **Adopt** |
| Time left in chapter from reader's own speed | Kindle | Direct | Clean | Medium | **Adopt** |
| Reading speed measured locally | Kindle | Indirect | Clean, stays on device | Small | **Adopt** |
| Themes bundle font plus background | Apple Books | Direct | Clean, token-driven | Small | **Adopt** |
| Auto night theme | Apple Books | Direct | Clean | Small | **Adopt** |
| Vertical or paged scroll choice | Apple, Kindle, Everand | Direct | Already partly present | Small | **Adopt** |
| Derived stats with zero manual logging | Everand, Fable | Indirect | Clean, derived only | Medium | **Adopt** |
| Full annotation set: bookmark, highlight, note, quote | Kindle, Libby, Goodreads | Direct | Clean, already present | Small | **Adopt** |
| Notebook-style consolidated notes view | Kindle My Notebook | Indirect | Clean | Small | **Adopt** |
| Reader quotes as landing social proof | Libby | Indirect | Clean, verified quotes only | Small | **Adopt** |
| Warm, encouraging product voice | Libby, Apple Books | Indirect | Clean | Small | **Adopt** |

## Tier 2: adapt before adopting

| Mechanic | Source | Adaptation required | Verdict |
| --- | --- | --- | --- |
| Real page or unit numbers | Kindle | Show unit position plus percent; no fabricated page mapping | **Adapt** |
| Annual reading goal | Goodreads Challenge | Local only, recoverable, no loss state, self-set | **Adapt** |
| Daily reading goal | Apple Books | Self-set, opt-in, encouraging framing only | **Adapt** |
| Reading streak | Apple, Fable, Everand | Only opt-in, never punitive, rest days neutral, no freeze sales | **Adapt / Opt-in** |
| Reminders and coaching | Apple Books | Opt-in, never during reading, never escalating | **Adapt / Opt-in** |
| Look-back or skim view | Kindle Page Flip | Lightweight, no 3D flip, must not animate the text column | **Adapt** |
| In-book definition lookup | Kindle dictionary | Needs a bundled local dictionary, no network call | **Adapt** |
| Sleep timer for audio | Libby, Everand | Feeds [[TTS Synchronization]] | **Adapt** |
| Widget-like ambient progress | Bookly category, Fable | PWA phase only, ambient, non-demanding | **Adapt** |
| Time-boxed reading sprint | Bookly category | Opt-in, bounded, no ranking | **Adapt** |
| Session count and timing | Bookly category | Derived automatically, never manually logged | **Adapt** |
| Collections or shelves | Kindle, Goodreads | Local tags only, no social graph | **Adapt** |

## Tier 3: defer with a named blocker

| Mechanic | Blocker | Verdict |
| --- | --- | --- |
| Cross-device sync | Local-first position plus no server for user data | **Defer** |
| Companion app for stats | Needs a second product surface | **Defer** |
| Social reading layer | Needs hashing protocol and abuse controls, see [[Social Resonance]] | **Defer** |
| Recommendation engine | Needs content signals Bookflow deliberately does not collect | **Defer** |
| Audiobook narration | Needs licensed audio or a TTS pipeline | **Defer** |
| Family sharing | Needs accounts, which conflict with zero-friction import | **Defer** |
| Device handoff to e-readers | Needs platform integrations | **Defer** |

## Tier 4: reject

| Mechanic | Source | Why it is rejected |
| --- | --- | --- |
| Infinite friend activity feed | Goodreads | Infinite scroll competes directly with reading |
| Leaderboards between readers | Bookly category | Reading is not a competitive sport |
| Achievement badges | Bookly category | Cosmetic, no measured reading effect |
| Streak freeze or repair purchases | Bookly category | Monetizes failure anxiety, launders loss aversion |
| Catalog and store inside the reader | Kindle, Everand | Commercial surface inside the reading space |
| New release alerting during reading | Kindle | Interrupts the current book |
| Waitlist and fake availability | Libby | Manufactured scarcity the product does not have |
| Subscription unlock gating | Everand | Bookflow reads the reader's own files |
| Manual reading logging | Bookly category | Weak, falsifiable, contradicts derived stats |
| Algorithmic recommendation feed | Goodreads | Requires content surveillance and trust erosion |
| "Readers like you" social proof counts | Bookly category | Needs server data, creates comparison pressure |
| Gamified XP or levels | Bookly category | Turns reading into a points economy |

## The three-line decision rule

```text
Measures real reading            -> adopt
Manufactures return pressure     -> opt-in at most, clearly labeled
Ranks readers against peers      -> reject
```

## Decisions needed from the user

These are the mechanics where the evidence supports more than one ethical answer, and where the
invariants would need an explicit amendment to change course.

| Decision | Options | Consequence |
| --- | --- | --- |
| Daily streak | Reject entirely, or opt-in only | Opt-in requires no invariant change; default-on requires an [[Invariants]] amendment |
| Achievement badges | Reject, or opt-in as reading milestones | Opt-in keeps the calm default intact |
| Reading challenge | Annual local goal, or none | Annual goal fits existing invariants with no amendment |
| Manual logging of outside reading | Reject, or a lightweight local entry | Reject preserves the derived-stats principle |
| Widgets | PWA phase, or skip | Requires the [[PWA Offline]] work first |

Everything in Tier 1 and Tier 2 requires **no invariant change**. Only default-on streaks, badges,
and manual logging would require amending [[Invariants]] and [[Ethical Guardrails]], and that is
the user's call, not this note's.

## Totals

| Verdict | Count |
| --- | --- |
| Adopt | 14 |
| Adapt | 12 |
| Defer | 7 |
| Reject | 12 |

The shape matters more than the numbers: nothing in the adopt column requires a rule change, and
every rejected item is rejected for a reading reason rather than a technical one.

Related: [[Massive Upgrade Backlog]], [[Audit Compare Replan]], [[Ethical Guardrails]],
[[Competitor Research MOC]].