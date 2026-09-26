---
title: Reading Lens and Focus Bar
type: feature
status: verified
updated: 2026-09-26
tags: [bookflow, reader, reading-lens, privacy, overlay]
source-files: [src/features/reader/components/FocusCard.jsx, src/features/reader/components/FocusBarHost.jsx, src/features/reader/components/FocusBarBackdrop.jsx, src/features/reader/components/SelectionTooltip.jsx, src/features/reader/hooks/useReadingLens.js, src/features/reader/hooks/useReaderSelection.js, src/store/uiStore.js]
---

# Reading Lens and Focus Bar

The consent-gated assistant that answers questions about a reader selection, plus
the floating card that hosts it. The card is one component with two surfaces.

Status: **verified**. Consent, streaming, drag, and the minimal card contract are
all measured. See [[Backend Endpoints]] for the transport contract and
[[Sentence-Paced Scroll]] for how the card coexists with smooth scroll.

## Two surfaces, one component

`FocusCard.jsx` takes a `surface` prop.

| Surface | Mounted by | Behaviour |
| --- | --- | --- |
| `reader` (default) | `ReaderOverlays.jsx`, only when a paragraph is focused | Full card, reader actions, participates in the reader safe viewport |
| `global` | `FocusBarHost.jsx`, from `App.jsx` on the landing surface | Ambient bar, no book required, reader actions suppressed |

The global bar is deliberately **not** mounted in the reader. The reader already
owns a card, and two cards would duplicate the overlay and work against
[[Invariants]] rule 3.

## The card must not be a `<section>`, and must not be bundled with one

Two related traps, both of which caused real bugs here.

**Element type.** The card root renders as a plain `<div>`, not a `<section>`. It is a direct
child of `.reader-layout`, and `reader.css` styles `.reader-layout > section:first-of-type` as the
reader's own topbar, including a `.is-collapsed` variant that strips background, border, shadow,
and padding.

While the card was a `<section>`, those selectors matched the card itself. The visible symptom was
a collapsed pill with no surface, rendered as bare text and pinned top-centre, plus an open card
carrying the topbar's `340px` minimum width. Changing the element removed the collision at its
source; no override was needed.

**Selector bundling.** The reader's liquid-glass top section and the card were once a single
selector list, so the card silently inherited `position: absolute`, `top: 14px`, `left: 50%`,
`margin-left: -190px`, `min-width: 340px`, and `flex-direction: column`. That inheritance is why
the collapsed pill stacked its close button under the toggle, and why the card rendered as a
`section`.

The card is now fully defined by its own rule in `src/styles/reading-lens.css` and no structural
`div#root ... > section >` prefix targets it. Layout-state selectors such as
`.reader-layout.has-reader-panel .focus-card` are legitimate and stay.

**How the split was verified.** Baseline screenshots were hashed before the change and re-hashed
after, across two themes (`paper`, `midnight`), two viewports (430, 1280), and both card states.
All 8 were byte-identical, and all 38 captured computed properties on the open card matched
exactly. Do not repeat this refactor on visual inspection alone.

Lesson for this file: never bundle a floating overlay into a structural layout selector list.

## Invariants

- The global bar is marked `data-focus-bar-surface="global"`, never
  `data-reader-bottom-overlay`. Five reader hooks query the latter to shrink the
  safe scroll band, so a global card carrying that attribute would permanently
  compress the reader.
- `boundsRef` defaults to the viewport, so the bar clamps to the window rather
  than the reader scroll container.
- Without a focused paragraph the reader surface returns `null`; the global
  surface renders anyway.

## Minimal card contract

Rewritten 2026-09-26 against the toast reference. Measured at a 430px viewport
on the sample book: the open card is `410 x 332` with 15 interactive elements,
and the collapsed pill is `172 x 56` with a 44px tap target. The card previously
rendered roughly 500px tall with a duplicated passage block and two explanatory
paragraphs; those are gone.

| Kept | Removed |
| --- | --- |
| Title plus one supporting line in the header, which also toggles the panel | Bordered `<blockquote>` repeating the visible selection |
| Consent as one icon toggle inside the input pill | Two hint paragraphs explaining consent and chapter scope |
| Four icon-only quick actions | Four repeated `Local` sublabels |
| Reader action row, unchanged | The standalone status line and the `Held` badge |
| Chat transcript, unchanged | Header expand and reset buttons; reset stays on `R` and `Home` |

Nothing was lost for assistive technology: every explanation moved to `title` or
`aria-describedby`, and the live region still carries `role="status"` with
`aria-live="polite"`.

## Scroll-away behaviour

The card rests folded to its pill. Entering a book shows the text, not a panel,
and selecting text opens the card. Scrolling to a new paragraph folds it away
again and clears the native selection, so the two resting states are "reading"
and "pinned to this passage". The card never follows the reader around.

An earlier build exempted the first render so opening a book still showed the
card. That exemption meant every book opened with a 332px panel over the first
third of the text, which is the opposite of calm. The default is now collapsed,
exposed as the `initiallyCollapsed` prop so both states stay testable.

## Selection toolbar

`SelectionTooltip.jsx` is `position: fixed` and follows the selection.

- **Position is imperative.** The anchor rect lives in a ref and the transform is
  written straight to the node via `translate3d`. Routing it through React state
  re-rendered the whole reader overlay tree once per frame for the sake of one
  toolbar.
- **It culls off-band.** A toolbar for text that has scrolled out of view is
  noise, so it returns `null` once less than 8px of the selection remains inside
  the reader band.

## Drag

Pointer Events with `setPointerCapture`, so mouse and touch share one path.
Verified 1:1 at 320, 390, 430, and 1280px, with the card staying inside the
viewport on every overshoot. Keyboard movement is on the handle via arrow keys,
with `Home` and `R` to reset.

Both capture calls are wrapped in `try`/`catch`. The optional-call form guards a
*missing method*, not a *throwing* one, and an uncaught throw inside a drag
handler is a real failure.

## Ambient backdrop

`FocusBarBackdrop.jsx` is a single shader plane, mounted only while the bar is
expanded so the landing page never holds two WebGL contexts at once.
`FocusBarAmbient.jsx` prefers a Spline scene when `VITE_SPLINE_SCENE` is set and
falls back to the procedural shader otherwise; the Spline runtime is never
fetched without a configured scene.

## Related

- [[Backend Endpoints]] for the `POST /api/reading-lens` contract
- [[Sentence-Paced Scroll]] for the single-ticker rule
- [[Invariants]] for the privacy and focus rules this card must respect
- [[File Placement Map]] for naming and placement
- [[Reader Engine MOC]]
