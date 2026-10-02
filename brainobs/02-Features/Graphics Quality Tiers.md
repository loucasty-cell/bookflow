---
title: Graphics Quality Tiers
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, performance, motion, accessibility, three]
source-files: [src/shared/graphics/quality.js, src/shared/graphics/quality.test.js, src/shared/components/AmbientDustCanvas.jsx, src/features/reader/components/FocusBarBackdrop.jsx, src/features/landing/components/LandingPage.jsx, src/features/landing/components/LivingShelf.jsx]
---

# Graphics Quality Tiers

One pure function that decides how much atmosphere a device can afford, so the ambient layer
never has to guess for itself and never pays for WebGL on a phone that cannot hold a frame rate.

Status: **verified**. Landed on `main` in `aef3a83` ("govern the ambient canvas by device tier
and take Three off the entry").

## Why it is its own module

`src/shared/graphics/quality.js` imports neither Three.js nor React. That is the entire design
constraint, stated in its header: *kept free of Three.js and React so it can be unit tested with
a fake window.*

The payoff is that the decision logic is testable without a GPU, a browser, or a canvas. The 12
cases in `quality.test.js` inject a synthetic `window` object. If this logic lived inside
`AmbientDustCanvas`, none of that would be possible.

`AmbientDustCanvas` is the only consumer and reads the result. It never re-derives device tiers,
so there is exactly one place to change the policy.

## The three tiers

| Tier | dpr cap | particles | glyphs | target fps |
| --- | --- | --- | --- | --- |
| `STATIC` | 1 | 0 | 12 | 0 |
| `BALANCED` | 1.25 | 18 | 22 | 30 |
| `FULL` | 1.75 | 32 | 38 | 60 |

## The decision, in order

```js
if (!win) return { ...STATIC_QUALITY };

if (matches(win, '(prefers-reduced-motion: reduce)')) {
  return { ...STATIC_QUALITY };
}

const touchPoints = readNumber(nav.maxTouchPoints, 0);
const cores = readNumber(nav.hardwareConcurrency, 8);
const memoryGb = readNumber(nav.deviceMemory, 8);

const isNarrow = matches(win, '(max-width: 720px)');
const isTouch = touchPoints > 0;
const isWeak = cores <= 4 || memoryGb <= 4;

if (isNarrow || isTouch || isWeak) return withDpr(BALANCED_QUALITY, dpr);
return withDpr(FULL_QUALITY, dpr);
```

Three properties of this shape are intentional and should not be "tidied up":

1. **Reduced motion short-circuits everything.** It is checked before any hardware probe, so a
   user who asks for reduced motion gets `STATIC` even on a desktop with plenty of headroom.
   `STATIC` means zero particles and a zero fps target. This is how
   `prefers-reduced-motion` is honoured for the ambient layer, satisfying the invariant in
   [[Invariants]] without a CSS-only workaround.
2. **`isTouch` alone caps at `BALANCED`.** No touch device ever reaches `FULL`, regardless of
   cores or memory. A high-end tablet has the silicon for more particles but not the thermal or
   battery headroom, and a dropped frame during reading is worse than a sparse background.
3. **Missing values fall back high, not low.** `hardwareConcurrency` defaults to 8 and
   `deviceMemory` to 8. The defaults are optimistic, but every unknown device is also matched by
   `isTouch` or `isNarrow`, so an unknown device is still capped at `BALANCED`. The optimistic
   defaults do not create an accidental `FULL` path.

`capDpr` clamps the real `devicePixelRatio` into `[1, tier cap]`. The floor of 1 prevents a
reported DPR below 1 from shrinking the canvas.

## Three.js is off the entry path

The commit that introduced this also removed Three.js from the entry bundle graph.
`LandingPage.jsx` imports `AmbientDustCanvas` **directly from its module**, bypassing
`src/shared/components/index.js`:

```js
// A barrel re-export would put three back in the entry graph.
const AmbientDustCanvas = lazy(() => import("../../../shared/components/AmbientDustCanvas.jsx"));
```

`src/shared/components/index.js` therefore deliberately does **not** re-export
`AmbientDustCanvas`, with a comment saying so. If you ever add it back, Three returns to the
entry chunk and the landing page pays for a shader it may never render. Verify with
`npm run build` and check that `vendor-three` is still split.

## The focus bar backdrop does not use this

`FocusBarBackdrop.jsx` is a separate WebGL surface and makes its own decisions. It does not
import `getGraphicsQuality`.

| Decision | `FocusBarBackdrop` |
| --- | --- |
| DPR cap | 1.5 |
| Power preference | `low-power` |
| Pause when off-screen | `IntersectionObserver` stops the RAF |
| Resize | `ResizeObserver` with a `lastW`/`lastH` short-circuit |
| Cleanup | `renderer.forceContextLoss()` |

This is a known divergence, not an accident worth hiding: the backdrop only mounts while the bar
is expanded, so its cost is bounded and intermittent, while `AmbientDustCanvas` runs for the
whole landing session. If the backdrop is ever made persistent, it should adopt the tier helper
rather than keep its own constants.

## Related

- [[Motion and Transitions]] for the reduced-motion contract across the app
- [[Home Widgets]] for the landing surface these tiers govern
- [[Reading Lens]] for the focus bar backdrop
- [[Accessibility Rules]]
- [[Invariants]]
- [[Tech Stack]] for where Three.js and GSAP sit in the bundle