---
title: Sentence-Paced Scroll
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, reader, scroll, motion, performance]
source-files: [src/features/scroll/index.js, src/features/scroll/smoothScroll.js, src/features/scroll/useReaderSmoothScroll.js, src/features/scroll/smoothScroll.test.js, src/features/reader/lib/useScrollPosition.js, src/styles.css]
---

# Sentence-Paced Scroll

Lenis drives the reader's scroll container so a gesture advances the focus rail by a readable
amount instead of flinging past several paragraphs.

Status: **verified**. Pairs with [[Focus Rail]] and [[Reading Lens]].

## The feature boundary

`src/features/scroll/` is its own feature with a public barrel. `src/features/scroll/index.js`
exports exactly:

| Export | Role |
| --- | --- |
| `SMOOTH_SCROLL_REASON` | `{ reader, landing }` reason keys |
| `getSmoothScroll`, `isSmoothScrollActive` | Inspect the live instance for a reason |
| `startSmoothScroll`, `stopSmoothScroll` | Generic reason-keyed start and stop |
| `startReaderSmoothScroll`, `stopReaderSmoothScroll` | Reader-scoped wrappers |
| `stopAllSmoothScroll` | Tear down every reason |
| `scrollContainerTo` | Programmatic scroll that cooperates with Lenis |
| `isNestedScroller` | The nested-scroller predicate used as Lenis `prevent` |
| `useReaderSmoothScroll` | Hook wrapper |

`SMOOTH_SCROLL_REASON` is why the landing page and the reader can both be smooth without fighting.

## Configuration and why each option is set

From `smoothScroll.js:96-111`:

| Option | Value | Line | Reason |
| --- | --- | --- | --- |
| `wrapper` | the reader canvas | `:97` | Scopes smoothing to the reading surface, not the window |
| `lerp` | `0.085` | `:99` | Below the 0.1 default; reading wants less glide than marketing pages |
| `smoothWheel` | `true` | `:100` | Wheel gestures are smoothed deliberately |
| `syncTouch` | `false` | `:101` | Keeps native touch scrolling. Momentum is not reading, and it avoids known iOS instability |
| `respectReducedMotion` | `true` | `:102` | Library default, kept explicit |
| `autoRaf` | `false` | `:103` | The GSAP ticker drives frames, so there is exactly one loop |
| `prevent` | `isNestedScroller` | `:104` | See below |
| `virtualScroll` | scales `deltaY` by `READER_DELTA_SCALE = 0.55` | `:30,105-110` | A wheel notch is about three lines of body text; scaling stops one gesture skipping paragraphs |

`virtualScroll` returns `false` immediately when `prefers-reduced-motion` is set (`:106`), so the
delta scaling is skipped rather than applied and then animated.

## The single-ticker rule

There must be **exactly one** smooth scroll owner per container, and exactly one frame loop.

`bindTicker(gsap)` (`smoothScroll.js:9-18`) registers exactly one `gsap.ticker` callback, guarded by a
module-level `tickerBound` flag, and calls `lenis.raf(time * 1000)` for every registered instance.
`gsap.ticker.lagSmoothing(0)` keeps scroll frames aligned with animation frames instead of drifting.

Teardown is symmetric: when the last instance stops, `stopSmoothScroll` clears the ticker and resets
`tickerBound` (`:142-145`), so a stopped feature stops costing frames.

Ownership is keyed by reason, with an `owners` map recording which element each reason is bound to
(`:2,113-114`). `stopSmoothScroll` only clears the `data-smooth-scroll-reason` marker when the
owner still carries it (`:136-139`), so a stale teardown cannot strip a newer instance's marker.

`startSmoothScroll` also keeps a `pending` map (`:3,122`) so a second call arriving while the Lenis
chunk is still loading returns the same promise instead of constructing two instances.

`useScrollPosition` consults the active instance on each native scroll event: when Lenis drives, it
updates directly instead of coalescing through its own `requestAnimationFrame`, because Lenis
already emits exactly once per frame. Before this, two independent loops were racing.

## The CSS conflict

`scroll-behavior: smooth` on the reading canvas is a bug. With Lenis also writing the scroll
position, the browser animated every write a second time, producing a double-smoothed,
rubber-banded feel. The declaration must stay removed so Lenis is the only scroll authority.

`src/styles.css:1` imports `lenis/dist/lenis.css` **first**, ahead of the token, tailwind, landing,
theme, and reader stylesheets. That ordering matters: Lenis's own rules must not be overridden by a
later project stylesheet that reintroduces native smooth behaviour.

## Programmatic scrolls

Writing `container.scrollTop` or calling `container.scrollTo` while Lenis is interpolating gets
overwritten on the next frame. All programmatic scrolls route through `scrollContainerTo`
(`smoothScroll.js:158-173`), which reads `container.dataset.smoothScrollReason`, delegates to
`lenis.scrollTo` when an instance is registered, and falls back to native `scrollTo` when it is not.
It returns whether Lenis handled the scroll, so callers can tell the two cases apart.

## Node identity

The reader canvas is tracked with a **callback ref**, not an object ref. React replaces the element
after the Lenis chunk resolves, so reading `containerRef.current` once at effect time binds Lenis to
a detached node and silently disables smooth scrolling. `startReaderSmoothScroll` accepts either a
node or a getter and re-resolves the wrapper after the await (`smoothScroll.js:87-92`); the marker is
written after attach (`:115-117`) so the element carrying it is always the element Lenis is bound to.

## Nested scrollers

`isNestedScroller(node)` (`smoothScroll.js:45-59`) walks up from the event target with a `seen` set
and returns true if any ancestor carries one of five classes:

| Class | Region |
| --- | --- |
| `contents-list` | Contents panel chapter list |
| `focus-card-chat-messages` | Focus card message thread |
| `settings-scroll` | Settings panel body |
| `notes-list` | Notes panel list |
| `notes-bento-list` | Notes panel bento list |

These regions own their own scroll. Smoothing a wheel event inside one makes the list look frozen
while the page moves behind it, which is exactly the bug `prevent` prevents.

## Tests

`src/features/scroll/smoothScroll.test.js` has 16 tests and mocks both `lenis` and `gsap`, so the
ticker binding, nested-scroller predicate, ownership, and programmatic-scroll delegation are all
exercised without a real animation loop.

## Verified baseline

Measured 2026-10-25 in-browser at 320, 390, 430, and 1280px: a 400px wheel gesture produced 52
distinct scroll positions across 115 frames with `scroll-behavior` computed as `auto`, keyboard
navigation advanced and reversed both scroll and focus, and horizontal overflow was `0` at every
width. Those are single-machine measurements, not a benchmark. Re-measure rather than quoting them
as a performance guarantee.

## Related

- [[Focus Rail]] for the anchor the scroll drives
- [[Reading Lens]] for the card that folds away on scroll
- [[Focus Rail Performance]] for the selection cost per frame
- [[Motion and Transitions]]
- [[Reader Engine MOC]]