---
title: Screen Architectures
type: reference
status: verified
updated: 2026-09-24
tags: [bookflow, ux, layout, screens]
source-files: [src/features/landing/components/LandingPage.jsx, src/features/landing/components/LivingShelf.jsx, src/features/landing/components/ThreeDBookCard.jsx, src/features/reader/components/ReaderShell.jsx, reactUIUXcover.md]
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
```

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

## Drawer behaviour rules

```text
Desktop   Side material. Canvas margin adjusts: 336px with settings,
          356px with notes. Only one sheet open at a time.
Mobile    Bottom sheet or off-canvas drawer. Only one open at a time.
          Closed sheets removed from keyboard focus order.
Both      Dismissible with Escape and with a tap outside.
```

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

Related: [[Responsive Breakpoints]], [[Motion and Transitions]], [[Accessibility Rules]], [[Figma Inspection Evidence]].