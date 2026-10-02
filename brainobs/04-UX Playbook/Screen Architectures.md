---
title: Screen Architectures
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, ux, layout, screens]
source-files: [src/features/landing/components/LandingPage.jsx, src/features/landing/components/LivingShelf.jsx, src/features/landing/components/ThreeDBookCard.jsx, src/features/landing/components/BookOpeningIntro.jsx, src/features/reader/components/ReaderShell.jsx, src/features/reader/components/ReaderPage.jsx, src/features/reader/components/CommandPalette.jsx, src/features/reader/components/ReaderOverlays.jsx, src/features/library/components/RecentShelf.jsx, src/features/lens-bar/components/LensBar.jsx, src/features/lens-bar/components/LensBarLauncher.jsx, src/features/widgets/components/WidgetGrid.jsx, src/components/AppLandingView.jsx, reactUIUXcover.md]
---

# Screen Architectures

The concrete layouts of every screen and overlay in Bookflow.

## Reader shell

```text
+---------------------------------------------------------------------------+
| Topbar: brand, document title, progress %, notes count, settings, close   |
+------------------+---------------------------------------+----------------+
| Contents         | Reader canvas                         | Settings or    |
| navigator        |  - document header and stats          | Notes drawer   |
| (collapsible)    |  - focus rail at 38%                  | (slide-in)     |
|  - miniature     |  - active paragraph highlight         |                |
|  - book stats    |  - static region label when detected  |  - font/measure|
|  - chapter list  |  - end mark and next book trigger     |  - themes      |
|  - quick jump    |                                       |  - notes list  |
+------------------+---------------------------------------+----------------+
|                  | Floating focus card (held or live)    |                |
+------------------+---------------------------------------+----------------+
```

## Landing page

```text
+---------------------------------------------------------------------------+
| Nav: quill brand, "Local by design" badge, light/dusk toggle              |
+---------------------------------------------------------------------------+
| Hero headline: "Read deeper. Keep going."                                 |
| Supporting copy: keeps your place, quiets the chrome, one paragraph       |
+---------------------------------+-----------------------------------------+
| Drag-and-drop card              | Hero visual with quill artwork          |
|  - glowing border on drag over  |                                         |
|  - format badges: PDF EPUB TXT  |  Floating callout badges                |
|  - upload icon micro-animation  |                                         |
|  - "Private check. No upload."  |                                         |
+---------------------------------+-----------------------------------------+
| Sample book action: "The Art of Staying Curious"                          |
+---------------------------------------------------------------------------+
| Widget grid, opt-in                                                  |
+---------------------------------------------------------------------------+
```

`AppLandingView` is the composition point above `LandingPage`. It lazily imports `WidgetGrid` and
`WidgetGridSkeleton` from the widgets barrel, so widget code is never in the reader's entry graph.

## Living shelf

`src/features/landing/components/LivingShelf.jsx` is the sample-book shelf rendered at the bottom
of the landing page. It holds `ThreeDBookCard` spines and responds to proximity rather than hover,
using `useProximityCssVars` with `reachY: 320` and `reachXPadding: 120`. It writes five custom
properties onto the plank: `--shelf-proximity-intensity`, `--shelf-proximity-blur-shift`,
`--shelf-proximity-spread`, `--shelf-proximity-y`, and `--shelf-plank-lift`.

`ThreeDBookCard.jsx` does the tilt with Framer Motion: `useMotionValue` for the raw pointer,
`useTransform` to map it to `rotateX`, `rotateY`, and a specular highlight position, then
`useSpring` on the rotations. Under `useReducedMotion` both rotations are forced to `0`.

The hero drag card uses the sibling hook instead: `LandingPage.jsx` calls `usePointerCssVars`,
whose defaults are `--pointer-x` and `--pointer-y`. The distinction is deliberate: the hero tracks
the pointer wherever it is, the shelf reacts only when a plank is genuinely near.

## Recent shelf

`src/features/library/components/RecentShelf.jsx` shows the reader's own books, newest first,
heading "Your books", default limit 5. `LandingPage.jsx` renders it after the hero.

Three properties matter and are enforced in its own header comment and code:

- Metadata only. Entries carry no document text.
- The title renders as a React text node, so a hostile filename or EPUB title cannot execute.
- It returns `null` when the library is empty, so a first-time visitor sees the curated shelf
  alone and never an empty shell.

It accepts `onSelect` and `onLocateFile`, so an entry whose file handle is gone can ask for
re-selection rather than failing silently.

## Overlay inventory

| Overlay | Trigger | Desktop | Mobile |
| --- | --- | --- | --- |
| Settings panel | Settings control | Side drawer | Bottom sheet |
| Notes panel | Notes control | Side drawer | Bottom sheet |
| Contents navigator | Contents control | Collapsible sidebar | Off-canvas drawer with scrim |
| Focus card | Active paragraph | Floating card | Floating card, width constrained |
| Selection tooltip | Text selection | Floating above selection | Floating above selection |
| OCR uploader | Opt-in scan action | Centre modal | Centre modal |
| Intervention modal | Drift detected, opt-in | Centred, dismissible | Centred, dismissible |
| Reward capsule | Chapter completion, opt-in | Overlay, dismissible | Overlay, dismissible |
| Opening intro | First visit | Full-screen transition | Skippable immediately |
| Command palette | Reader command shortcut | Centred panel over the canvas | Same, width constrained |
| Lens bar | Launcher button or selection | Portaled floating bar, draggable and collapsible | Same, collapsed by default |

## Command palette

`src/features/reader/components/CommandPalette.jsx` reaches the reader's controls without leaving
the paragraph. Its header states the contract: focus containment, Escape, and focus restoration
are delegated entirely to `useModalFocus`, so the reader has one focus-trap implementation rather
than two.

`filterCommands` is exported separately and is pure, so it can be unit tested without a DOM. It
matches on the label and on any of a command's keywords, case-insensitively, and returns the whole
list for an empty query.

The query is a local React string. It is never logged, stored, or sent.

`ReaderPage.jsx` owns it and renders nothing when `open` is false.

## Lens bar

The Reading Lens is a floating bar, not a drawer. It is portaled to `document.body` by
`LensBar.jsx`, which is why `scripts/security/contrast.mjs` measures its contrast from
`src/features/lens-bar/lens-bar.css` rather than from the app theme layer.

| Aspect | Implementation |
| --- | --- |
| Launcher | `LensBarLauncher.jsx`, an `icon-button` labelled "Open assistant" with `aria-haspopup="dialog"` |
| Panel role | `role="region"`, `aria-label="Reading assistant"`, not a modal dialog |
| Region | `src/features/lens-bar/`, its own `index.js` barrel, `lens-bar.css`, and a Zustand `lensBarStore` persisted under `bookflow:lens-bar` |
| Verbs | smart, summarize, explain, translate, define, ask, each with a human label |
| Consent | `useLensConsent` plus a `role="group"` labelled "Allow sending this passage" |
| Placement | Wired in through `ReaderOverlays.jsx`, which imports both `LensBar` and `LensBarLauncher` from the barrel |
| Drag | `useDraggableBar` |
| Errors | `role="alert"` so an OCR or provider failure is announced |

The consent control is not decoration. No selection means no request, and the panel stays local
until the reader grants consent for that passage.

Detail: [[Reading Lens]], [[Reading Lens Bar]].

## Drawer behaviour rules

```text
Desktop   Side material. Canvas margin adjusts: 336px with settings,
          356px with notes. Only one sheet open at a time.
Mobile    Bottom sheet or off-canvas drawer. Only one open at a time.
          Closed sheets removed from keyboard focus order.
Both      Dismissible with Escape and with a tap outside.
```

Escape is handled centrally, by `useModalFocus`, which stops propagation so one Escape cannot
close two layers at once.

## Chrome at rest

The reader at rest shows only:

```text
resume, chapter, progress, reader text, bookmark or note, settings
```

That list is the default-state contract. Any addition to the resting reader must displace
something or justify itself.

Detail: [[Invariants]], [[Ethical Guardrails]].

## State surfaces

| State | Treatment |
| --- | --- |
| Landing | Hero plus intake plus sample |
| Loading import | Progress with percent and a human label |
| Reading | Reader canvas plus rail |
| Pinned | Pinned styling plus resume affordance |
| Static region | Small reading label, native scrolling |
| End of book | End mark plus next book trigger |
| Error | Clear message naming the cause and the action |
| Empty | Never render an empty shell. Hide the surface |

`RecentShelf` returning `null` on an empty library and `WidgetGridSkeleton` standing in for the
widget grid are both instances of this rule, not exceptions to it.

## Verified checklist

- [ ] Landing hero, dropzone, and format badges render without layout shift.
- [ ] Opening transition plays on first visit and skips immediately on click.
- [ ] Focus rail highlights the active paragraph at 38 percent viewport height.
- [ ] Pin freezes the highlight; resume restores it.
- [ ] Step controls advance by paragraph and reset pin state.
- [ ] Sidebar collapses on desktop and becomes a drawer on mobile.
- [ ] Note composer attaches the quoted excerpt.
- [ ] Settings sliders update typography live.
- [ ] Themes apply accessible palettes.
- [ ] Front and end matter scroll without snapping.
- [ ] Progress, bookmarks, and notes persist across reloads.
- [ ] Recent shelf appears on the landing page once the library is non-empty, and is absent
      when it is empty.
- [ ] Command palette opens, filters, and restores focus to its trigger on Escape.
- [ ] Lens bar is portaled above every reader surface and sends nothing without consent.

Related: [[Responsive Breakpoints]], [[Motion and Transitions]], [[Accessibility Rules]],
[[Figma Inspection Evidence]], [[Home Widgets]].