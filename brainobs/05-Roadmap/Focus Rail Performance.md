---
title: Focus Rail Performance
type: roadmap
status: verified
updated: 2026-09-26
tags: [bookflow, reader, performance, focus-rail]
source-files: [src/features/reader/lib/focusRail.js, src/features/reader/lib/focusRail.equivalence.test.js, src/features/reader/hooks/useReaderSession.js]
---

# Focus Rail Performance

Why the sentence-to-paragraph selection routine is not a linear scan, and the
measurements that justify the current shape.

Status: **verified**. Exact-equivalence fuzzing against the original behaviour
plus a measured benchmark. Pairs with [[Focus Rail]] and
[[Sentence-Paced Scroll]].

## The problem

To find the active paragraph, the rail needs the sentence whose box covers the
0.38 viewport line. The straightforward implementation walks every paragraph and
every sentence, calling `getBoundingClientRect()` on each. That forces a layout
flush per box read, and a 420-page book turns a single scroll frame into
thousands of them.

Measured cost of the original scan at 8,000 paragraphs: **about 1.5 seconds per
invocation**.

## Current approach

1. `getBoundingClientRect()` once for each paragraph, in one pass.
2. Build a `WeakMap` of sentence boxes keyed by paragraph element.
3. Binary-search the top edge when paragraph tops are strictly increasing.
4. Walk the candidate window for genuine overlaps.

Stacks, custom elements, and spanner-based screens break the strict-monotonic
assumption, so a non-monotonic input falls back to the ordered linear scan
rather than returning a wrong answer. Silent incorrectness is worse than a slow
answer, and books do produce both.

## Correctness first

`focusRail.equivalence.test.js` fuzzes the optimised routine against a reference
linear implementation across three regimes: ordered paragraphs, randomly
shuffled paragraphs, and deliberately overlapping boxes. Every case must return
the identical paragraph, sentence, and offset. A speedup that changes an answer
is a regression, so this test gates the optimisation rather than a comment.

## Measured baseline

Run by `npx vitest run src/features/reader/lib/focusRail.equivalence.test.js`,
which prints the comparison line per size. Measured 2026-09-26 on this machine.

| Paragraphs | Optimised | Speedup |
| --- | --- | --- |
| 500 | 0.25 ms | 56x |
| 2,000 | 1.4 ms | 646x |
| 8,000 | 0.4 ms | 2,696x |

Absolute times stay sub-millisecond while paragraph counts grow about sixteen
fold. The speedup grows faster than linear because the paragraph pass is
O(n) but the sentence pass, which is the dominant cost, collapses to a binary
search plus a small window.

These are machine-dependent and the timings are printed by the test, not
asserted. Re-run the command above rather than copying the table into a claim.

## Related

- [[Focus Rail]] for the anchor ratio and containment rules
- [[Sentence-Paced Scroll]] for the scroll events that trigger the rail
- [[Reading Lens and Focus Bar]] for the card that folds when focus advances
- [[Roadmap MOC]]
