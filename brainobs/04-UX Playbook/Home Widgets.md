---
title: Home Widgets
type: feature
status: verified
updated: 2026-09-26
tags: [bookflow, ux, widgets, figma, library]
source-files: [src/features/widgets/index.js, src/features/widgets/lib/tokens.js, src/features/widgets/lib/specIndex.js, src/features/widgets/lib/widgets.css, src/features/widgets/components/WidgetGrid.jsx, src/components/AppLandingView.jsx]
---

# Home Widgets

A home-screen-style widget grid on the landing surface, with geometry taken
directly from a Figma community kit rather than invented.

Status: **verified**. All 83 components extracted, geometry measured, grid
verified in-browser. Pairs with [[Figma Inspection Evidence]] for the fetch
method.

## Source

Figma file `zST5IOFYB6MgjnwAzpMxNt` ("Apple Widgets UI Kit (Community)"), root
node `6:59`. Read with the Figma MCP.

**83 components** were extracted across four spec files: `appleSmallMedium`
(27), `appleLarge` (14), `productivity` (26), and `parts` (16). Every entry
carries a Figma node id, component key, size bucket, box, radius, surface, and
layer list. No geometry is hand-typed; `tokens.js` states that re-running the
extraction is the way to change a value.

## Measured geometry

| Size | Box | Radius |
| --- | --- | --- |
| Small | 155 x 155 | 21.67px |
| Medium | 329 x 155 | 21.67px |
| Large | 329 x 345 | 21.67px |

The Figma value is `21.670000076293945px`; the tail is float artifact.

The grid uses true home-screen cell spanning: small widgets take one cell,
medium and large span both. Verified in-browser at 320, 390, 768, and 1280px
with the aspect ratios preserved exactly and horizontal overflow `0`.

## Data binding

Widgets bind only to fields verified to exist. Two constraints shaped this:

- **There is no daily goal.** `readingGoals.js` is explicitly an annual
  books-finished horizon, and `readingStats.test.js` asserts the stats object
  must not contain `streak`, `continuity`, or `activeDays`. A daily-streak
  widget would need new storage and would contradict an existing test, so the
  goal widget is labelled annual books.
- **No pace is persisted.** `computeWordsPerMinute` and `blendPace` are public
  but have no call site and nothing stores a value, so there is no speed ring.

| Widget | Source |
| --- | --- |
| Rings | `evaluateAchievements` ratios, filtered to partially earned badges |
| Annual goal | `getGoalProgress({ booksFinished: stats.finished })` |
| Time reading, notes, sessions | `getLibraryStats().formatted` |
| Continue reading | `getResumeEntry()` |
| Shelves | `getShelfCounts` |
| Library list | `getEntries()` |

`getGoalProgress` must be passed `booksFinished` explicitly; it defaults to `0`
and does not count the library. Omitting it renders a false zero.

## Opt-in

Gated on `settings.showAchievements`, which defaults to `false`, following the
repo rule that behavioural surfaces are opt-in.

## Motion

`anime.js` v4 tweens values on a proxy object and writes `textContent` directly,
so a 60fps counter never re-renders React. `gsap` ScrollTrigger reveals the grid
once, and both collapse to static under `prefers-reduced-motion`.

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
- [[Screen Architectures]]
- [[UX Playbook MOC]]
