---
title: Focus Rail Performance
type: roadmap
status: verified
updated: 2026-10-02
tags: [bookflow, reader, performance, focus-rail]
source-files: [src/features/reader/lib/focusRail.js,src/features/reader/lib/focusRail.equivalence.test.js,src/features/reader/lib/readingController.js,src/features/reader/hooks/useReaderSession.js]
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

The anchor ratio itself is `FOCUS_RAIL_RATIO = 0.38`, exported from
`src/features/reader/lib/readingController.js:1`. It is a plain constant, not a
tunable setting, and the selection routine below is what makes holding that line
affordable.

Measured cost of the original scan at 8,000 paragraphs: **about 1.5 seconds per
invocation**, per the 2026-09-26 run cited below.

## Current approach

1. `getBoundingClientRect()` once for each paragraph, in one pass.
2. Build a `WeakMap` of sentence boxes keyed by paragraph element.
3. Cache the derived paragraph order in an identity-keyed `WeakMap`
   (`orderCache` in `focusRail.js:14`), invalidated when the source list length
   changes, so a reordered DOM is never served a stale order.
4. Binary-search the top edge when paragraph tops are strictly increasing.
5. Walk the candidate window for genuine overlaps.

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
which prints the comparison line per size. Re-measured 2026-10-02 on this
machine:

| Paragraphs | Optimised | Reference | Speedup |
| --- | --- | --- | --- |
| 500 | 1.3 ms | 75.9 ms | 59.8x |
| 2,000 | 0.4 ms | 413.3 ms | 945.3x |
| 8,000 | 0.7 ms | 1,688.6 ms | 2,285.3x |

The 2026-09-26 run on the same machine recorded 56x, 646x, and 2,696x. Treat
the speedup column as an order-of-magnitude claim, not a stable figure: the
optimised timings are sub-millisecond and therefore dominated by timer noise,
while the reference timings are milliseconds long. Across both runs the
reference is roughly 900x to 3,000x slower at 2,000 and 8,000 paragraphs, and
around 60x at 500, where the paragraph pass is a larger share of the total.

Absolute times stay sub-millisecond while paragraph counts grow about sixteen
fold. The speedup grows faster than linear because the paragraph pass is O(n)
but the sentence pass, which is the dominant cost, collapses to a binary search
plus a small window.

These are machine-dependent and the timings are printed by the test, not
asserted. Re-run the command above rather than copying the table into a claim.

## Related

- [[Focus Rail]] for the anchor ratio and containment rules
- [[Sentence-Paced Scroll]] for the scroll events that trigger the rail
- [[Reading Lens]] for the card that folds when focus advances
- [[Roadmap MOC]]
