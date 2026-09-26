---
title: Sentence-Paced Scroll
type: feature
status: verified
updated: 2026-09-26
tags: [bookflow, reader, scroll, motion, performance]
source-files: [src/features/scroll/smoothScroll.js, src/features/scroll/useReaderSmoothScroll.js, src/features/reader/lib/useScrollPosition.js, src/styles/reader.css]
---

# Sentence-Paced Scroll

Lenis drives the reader's scroll container so a gesture advances the focus rail
by a readable amount instead of flinging past several paragraphs.

Status: **verified**. Measured in-browser at 320, 390, and 1280px. Pairs with
[[Focus Rail]] and [[Reading Lens and Focus Bar]].

## Configuration and why each option is set

| Option | Value | Reason |
| --- | --- | --- |
| `wrapper` | the reader canvas | Scopes smoothing to the reading surface, not the window |
| `lerp` | `0.085` | Below the 0.1 default; reading wants less glide than marketing pages |
| `syncTouch` | `false` | Keeps native touch scrolling. Momentum is not reading, and it avoids known iOS instability |
| `respectReducedMotion` | `true` | Library default, kept explicit |
| `autoRaf` | `false` | The GSAP ticker drives frames, so there is exactly one loop |
| `prevent` | nested-scroller predicate | See below |
| `virtualScroll` | scales `deltaY` by `0.55` | A wheel notch is about three lines of body text; scaling stops one gesture skipping paragraphs |

## One loop owns the frame

`gsap.ticker` is the single authority. Lenis registers on it, so scroll,
animation, and the focus bar shader all advance in the same frame.

`useScrollPosition` consults the active instance on each native scroll event:
when Lenis drives, it updates directly instead of coalescing through its own
`requestAnimationFrame`, because Lenis already emits exactly once per frame.
Before this, two independent loops were racing.

## The CSS conflict

`.reader-canvas` previously declared `scroll-behavior: smooth`. With Lenis also
writing `scrollTop`, the browser animated every write a second time, producing a
double-smoothed, rubber-banded feel. The declaration was removed so Lenis is the
only scroll authority.

## Programmatic scrolls

`scrollToParagraph` writes `container.scrollTo`, which Lenis would overwrite on
its next frame. All programmatic scrolls now route through
`scrollContainerTo`, which delegates to `lenis.scrollTo` when a container is
registered and falls back to native `scrollTo` when it is not.

Verified: `ArrowDown`, `j`, and `PageDown` each advance both scroll position and
the focused paragraph, and `ArrowUp` steps back.

## Node identity

The reader canvas is tracked with a **callback ref**, not an object ref. React
replaces the element after the Lenis chunk resolves, so reading
`containerRef.current` once at effect time binds Lenis to a detached node and
silently disables smooth scrolling. Keying the effect on the node itself
guarantees attach and teardown refer to the same element.

## Nested scrollers

Five regions own their own scroll and must never be smoothed, or the list looks
frozen while the page moves behind it: `contents-list`,
`focus-card-chat-messages`, `settings-scroll`, `notes-list`, and
`notes-bento-list`.

## Verified baseline

Measured 2026-09-26.

| Check | Result |
| --- | --- |
| A 400px wheel gesture | 52 distinct scroll positions across 115 frames, decelerating, `scroll-behavior` computed as `auto` |
| Keyboard navigation | `ArrowDown`, `j`, `PageDown` advance scroll and focus; `ArrowUp` reverses |
| Horizontal overflow | `0` at 320, 390, 430, and 1280px |
| Lenis chunk | 18.2 kB, lazily loaded, not in the landing critical path |

## Related

- [[Focus Rail]] for the anchor the scroll drives
- [[Reading Lens and Focus Bar]] for the card that folds away on scroll
- [[Focus Rail Performance]] for the selection cost per frame
- [[Motion and Transitions]]
- [[Reader Engine MOC]]
