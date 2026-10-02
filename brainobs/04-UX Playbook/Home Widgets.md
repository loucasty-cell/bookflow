---
title: Home Widgets
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, ux, widgets, figma, library]
source-files: [src/features/widgets/index.js, src/features/widgets/lib/tokens.js, src/features/widgets/lib/specIndex.js, src/features/widgets/lib/widgetMotion.js, src/features/widgets/lib/useWidgetReveal.js, src/features/widgets/lib/spec/appleSmallMedium.js, src/features/widgets/lib/spec/appleLarge.js, src/features/widgets/lib/spec/productivity.js, src/features/widgets/lib/spec/parts.js, src/features/widgets/components/WidgetFrame.jsx, src/features/widgets/components/BookflowWidgets.jsx, src/features/widgets/components/WidgetGrid.jsx, src/features/widgets/lib/widgets.css, src/components/AppLandingView.jsx]
---

# Home Widgets

A home-screen-style widget grid on the landing surface, with geometry taken
directly from a Figma community kit rather than invented.

Status: **verified**. All 83 components extracted, geometry measured, grid
verified in-browser. Pairs with [[Figma Inspection Evidence]] for the fetch
method.

## Source

| Field | Value |
| --- | --- |
| Figma file key | `zST5IOFYB6MgjnwAzpMxNt` |
| Root node | `6:59` |
| Kit name | Apple Widgets UI Kit (Community) |

These three values are `WIDGET_FILE_KEY`, `WIDGET_ROOT_NODE`, and the file header comment in
`src/features/widgets/lib/tokens.js`. `WIDGET_SOURCE_URL` there carries the same ids in URL form,
where the colon becomes a hyphen. The file header reads "Do not hand-edit: re-run the extraction
instead", so no geometry value in this feature is hand-typed.

## The spec system

`lib/specIndex.js` concatenates four arrays into one `widgetSpec` and exports `findWidgetById`
and `widgetsBySize`.

| Spec file | Entries | Size bucket |
| --- | --- | --- |
| `lib/spec/appleSmallMedium.js` | 27 | small and medium |
| `lib/spec/appleLarge.js` | 14 | large |
| `lib/spec/productivity.js` | 26 | mixed |
| `lib/spec/parts.js` | 16 | none, bare parts |
| Total | 83 | |

Every entry carries a real Figma node id, a 40-hex component key, a size, a box, a radius, a
surface, and a `layers[]` array. Each layer carries a `kind` of `group`, `rectangle`, `text`, or
`instance`/`frame`, its `x`/`y`/`w`/`h`, and for text layers the inline style. The `parts` entries
deliberately have `layers: []` and null geometry, because the Figma API returned root-only for
those nodes even at depth 8.

## Measured geometry

| Size | Box | Radius |
| --- | --- | --- |
| Small | 155 x 155 | 21.67px |
| Medium | 329 x 155 | 21.67px |
| Large | 329 x 345 | 21.67px |

The Figma value is `21.670000076293945px`; the tail is float artifact, so `WIDGET_RADIUS` is
`21.67`. `widgetBox(size)` returns the box for a size and falls back to small.

## Token families in `lib/tokens.js`

| Export | Contents |
| --- | --- |
| `WIDGET_SIZES` | small, medium, large boxes |
| `WIDGET_SCALES` | four scale steps from `scale(1)` down to `scale(0.25)` |
| `WIDGET_RADIUS` | the single corner radius for all three sizes |
| `WIDGET_TYPE` | seven-step ramp: display, title, headline, label, body, caption, micro |
| `WIDGET_SURFACES` | eleven observed gradients and flat colours, keyed by originating widget |
| `WIDGET_INK` | four ink values: on-dark, on-dark-muted, on-light, on-light-muted |
| `widgetBox(size)` | box lookup with a small fallback |

Tracking in the type ramp is size-specific, not a single token: negative on `display` and
`title`, zero on `headline` and `body`, slightly positive on the small caption sizes.

The grid uses true home-screen cell spanning: small widgets take one cell, medium and large span
both. Verified in-browser at 320, 390, 768, and 1280px with the aspect ratios preserved exactly
and horizontal overflow `0`.

## The five widget types

All five live in `components/BookflowWidgets.jsx` and all render through `WidgetFrame`.

| Component | Size | Binds to |
| --- | --- | --- |
| `RingsWidget` | small | Up to three partially earned `evaluateAchievements` ratios, rendered as `WidgetRing` arcs |
| `StatWidget` | small | A formatted string from `getLibraryStats().formatted` |
| `GoalWidget` | small | `getGoalProgress({ booksFinished: stats.finished })` |
| `ContinueWidget` | medium | `getResumeEntry()`, with `onResume` |
| `ListWidget` | medium and large | `getShelfCounts` rows, or the first four `getEntries()` |

`WidgetGrid` in `components/WidgetGrid.jsx` composes exactly seven instances: a rings or sessions
small, a time-reading small, an annual-goal small, a notes small, a continue medium, a shelves
medium, and a library large. It falls back to a sessions `StatWidget` when no badge is partially
earned, so the first cell is never empty.

`WidgetFrame` also exports `WidgetRing` and `WidgetMeter`. `WidgetMeter` is the only piece of the
frame that exposes a `role="progressbar"` with `aria-valuenow`.

`WidgetGridSkeleton` is the Suspense fallback. `AppLandingView` lazily imports `WidgetGrid` and
`WidgetGridSkeleton` from the feature barrel, so the widget code stays out of the reader's entry
graph.

## Data binding constraints

Widgets bind only to fields verified to exist. Two constraints shaped this:

- **There is no daily goal.** `readingGoals.js` is explicitly an annual
  books-finished horizon, and `readingStats.test.js` asserts the stats object
  must not contain `streak`, `continuity`, or `activeDays`. A daily-streak
  widget would need new storage and would contradict an existing test, so the
  goal widget is labelled annual.
- **No pace is persisted.** `computeWordsPerMinute` and `blendPace` are public
  but have no call site and nothing stores a value, so there is no speed ring.

`getGoalProgress` must be passed `booksFinished` explicitly; it defaults to `0`
and does not count the library. Omitting it renders a false zero.

## Refresh

`WidgetGrid` re-reads its snapshot on three window events: `bookflow:library-change`, `storage`,
and `focus`. The first is the in-app signal from the library; the other two catch cross-tab
changes and a returning tab. All three listeners are removed on unmount.

## Motion

Two independent systems, both with a reduced-motion path.

**anime.js, value tweens.** `lib/widgetMotion.js` imports `animate`, `createScope`, and `utils`
from `animejs`. Its header states the rule: the animated number lives on a plain proxy object and
is written straight to the node's `textContent`, so a 60fps tween never re-renders the React tree.
`tweenNumber` tweens `proxy.value` with `out(3)` over a 900ms default; `tweenRing` tweens
`strokeDashoffset` with `out(2)` over 780ms. Both call `write(to)` and return `null` immediately
when `prefers-reduced-motion: reduce` matches, so the final value still lands.

**GSAP, grid reveal.** `lib/useWidgetReveal.js` dynamically imports `gsap` and `gsap/ScrollTrigger`
so neither is in the entry bundle. It sets `.widget-frame` cards to opacity 0 and y 18, then
creates one ScrollTrigger at `start: "top 92%"` with `once: true` that animates them to opacity 1
and y 0 over 0.62s with `power3.out` and a 0.055s stagger from `start`. It returns early, before
the dynamic imports, when reduced motion is requested, so the grid is simply present. The trigger
is killed and the async load is cancelled on unmount.

## Dead code

`src/features/widgets/components/AnimatedValue.jsx` exports `AnimatedValue` and `AnimatedRing`
and is not imported anywhere in the repo. It is also internally broken: it imports
`./widgetMotion.js`, but that module lives at `lib/widgetMotion.js`, so the path does not resolve.

The technique it demonstrates is live and correct in `lib/widgetMotion.js`. The React wrapper that
would call it is not wired up. Nothing in the shipped grid currently uses the anime.js tween.

## Opt-in

Gated on `settings.showAchievements`, which defaults to `false`, following the
repo rule that behavioural surfaces are opt-in.

## Honest limits

- A browser SPA cannot produce a real iOS or Android home-screen widget. This is
  an in-app grid, not a platform widget extension.
- The shared parts (icons, headers, task rows) are 16 entries with no child
  layers, because the Figma API returns root-only for those nodes even at depth
  8. That is an API limitation, recorded rather than papered over.

## Related

- [[Figma Inspection Evidence]] for the fetch method and other reviewed files
- [[Library and Reading Stats]] for the data behind each widget
- [[Design Tokens]] for the radius and type ramp
- [[Motion and Transitions]] for the reduced-motion contract
- [[Accessibility Rules]] for the progressbar semantics
- [[Screen Architectures]]
- [[UX Playbook MOC]]