---
title: Competitor Research MOC
type: MOC
status: living
updated: 2026-09-23
tags: [bookflow, competitor, research, moc]
---

# Competitor Research MOC

Primary-source research on the reading apps people actually use daily. The goal is not to copy
them. It is to understand which mechanics genuinely drive reading, which drive only app opens,
and which ones Bookflow should refuse on purpose.

## Notes

- [[Competitor Mechanics Scorecard]] - every mechanic scored adopt / adapt / reject
- [[Kindle Research]] - the reference implementation for library, sync, and progress
- [[Apple Books Research]] - the reference implementation for goals, streaks, and theming
- [[Everand Scribd Research]] - subscription unlocks and the Fable streak companion
- [[Libby Research]] - borrowing, holds, and the best "why it feels good" lesson
- [[Goodreads Research]] - shelves, challenges, and social motivation
- [[Bookly and Fable Research]] - pure tracking and streak apps, the gamification extreme

## Evidence rules

| Rule | Reason |
| --- | --- |
| Cite the source URL in the note | Claims must be checkable |
| Mark evidence quality per note | App store copy and help pages are not the same as measured behavior |
| Never invent internals | No guessing at another company's implementation |
| Separate observed feature from inferred motive | Motive is a hypothesis, not a fact |
| Update `updated:` when a store listing changes | Listings change often |

## Evidence quality levels

| Level | Meaning | Example source |
| --- | --- | --- |
| Strong | Official product or help documentation | Apple support, Amazon help |
| Medium | First-party store listing copy | App Store description |
| Weak | Marketing page, third-party summary | Landing pages, press coverage |
| Inferred | Our own reasoning about motive | Never presented as fact |

## The one question for every mechanic

```text
Does this make the reader read more, or does it make the app opened more?
```

Only the first kind belongs in Bookflow by default. The second kind may exist as an opt-in, and
must be documented as such. Full policy in [[Ethical Guardrails]].

## Related

- [[Competitor Analysis]] - the earlier positioning note in Psychology
- [[Audit Compare Replan]] - Bookflow audited against these findings
- [[Massive Upgrade Backlog]] - the resulting prioritized work list
- [[Atomic Habits Framework]] - the habit model these mechanics are scored against