---
title: Reading Lens
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, reader, reading-lens, privacy, consent, overlay]
source-files: [src/features/reader/hooks/useReadingLens.js, src/features/reader/components/FocusCard.jsx, src/features/reader/components/FocusBarHost.jsx, src/features/reader/components/FocusBarAmbient.jsx, src/features/reader/components/FocusBarBackdrop.jsx, src/features/reader/components/SelectionTooltip.jsx, src/features/reader/components/ReaderOverlays.jsx, src/features/reader/hooks/useReaderSelection.js, src/store/uiStore.js]
---

# Reading Lens

The consent-gated assistant that answers questions about a reader selection, and the
floating focus card that hosts it. The card is one component with two surfaces.

Status: **verified**. Consent, local-only replies, streaming, drag, and the minimal card
contract are all measured. The separate draggable bar that shares this engine is documented
in [[Reading Lens Bar]]. Transport is in [[Backend Endpoints]]; coexistence with smooth
scroll is in [[Sentence-Paced Scroll]].

## Two surfaces, one component

`FocusCard.jsx` takes a `surface` prop.

| Surface | Mounted by | Behaviour |
| --- | --- | --- |
| `reader` (default) | `ReaderOverlays.jsx`, only when a paragraph is focused | Full card, reader actions, participates in the reader safe viewport |
| `global` | `FocusBarHost.jsx`, from `App.jsx` on the landing surface | Ambient bar, no book required, reader actions suppressed |

The global card is deliberately **not** mounted in the reader. The reader already owns a
card, and two cards would duplicate the overlay and work against [[Invariants]] rule 3.

`FocusBarHost.jsx` returns `null` unless both its own `open` prop and
`useUIStore().focusBarOpen` are true, and it lazy-imports `FocusCard` rather than importing
it eagerly.

## Two lens instances, one conversation

There are deliberately **two** `useReadingLens()` instances, and confusing them is the
easiest way to break consent or the transcript.

| Instance | Created at | Scope |
| --- | --- | --- |
| Selection-scoped | `ReaderOverlays.jsx:55` | Shared by `FocusCard` and `LensBar`. Carries the current selection. |
| Global ambient | `FocusBarHost.jsx:21` | Separate, launched with `selectedText: ""`. No book, no selection. |

Both point at the same backend contract but hold independent consent and transcript state.
Each instance never opens a second connection and never keeps a second answer buffer, so one
surface talking does not corrupt the other's view.

## Consent is enforced in the client before any request

The order inside `ask()` is the whole point:

1. If `consentGranted` is false, short-circuit and build a **local** reply via
   `buildLocalLensReply`. `fetch` is never called. The result is `{ ok: false, reason: "local" }`.
2. Only if consent is granted does it assemble `buildLensRequestBody({ ..., consent: true })`
   and call `LENS_ENDPOINT`.
3. Turning consent off calls `setConsentGranted(false)`, which aborts any in-flight
   `AbortController` immediately.

Client-side bounds, all enforced before egress:

| Bound | Value | Where |
| --- | --- | --- |
| `LENS_MAX_PASSAGE_CHARS` | 24000 | `useReadingLens.js:12` |
| `LENS_MAX_SELECTION_CHARS` | 4000 | `useReadingLens.js:13` |
| `LENS_MAX_CHAPTER_CHARS` | 12000 | `useReadingLens.js:14` |
| `LENS_RATE_LIMIT_MAX` | 40 per window | `useReadingLens.js:15` |
| `LENS_RATE_LIMIT_WINDOW_MS` | 15 minutes | `useReadingLens.js:16` |

The quota is persisted under `bookflow:lens_quota`; position under `bookflow:lens_position`.

The backend refuses the request too: `POST /api/reading-lens` raises **403** when
`consent` is not `true`, before the provider key is even read. See [[Backend Endpoints]].

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
- The focus card carries a single boolean consent toggle
  (`.lens-consent-toggle.lens-consent-dot` with `aria-pressed`). The three-way
  choice belongs to the bar; see [[Reading Lens Bar]].

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
expanded so the landing page never holds two WebGL contexts at once. It imports
`three` dynamically, caps DPR at 1.5, requests `powerPreference: "low-power"`,
pauses its RAF through an `IntersectionObserver` when off-screen, and disposes
the renderer with `forceContextLoss()`.

`FocusBarAmbient.jsx` prefers a Spline scene when `VITE_SPLINE_SCENE` is set and
falls back to the procedural shader otherwise. The Spline runtime is never
fetched without a configured scene. `FocusBarAmbient.jsx` exports
`SPLINE_SCENE_CONFIGURED` so callers can branch without re-evaluating the env var.

The backdrop makes its own reduced-motion and DPR decisions and does not consult
the shared tier helper. See [[Graphics Quality Tiers]] for the tier that governs
the landing ambient canvas.

## Known issue: the lazy import of FocusCard is defeated

`npm run build` reports:

```text
[INEFFECTIVE_DYNAMIC_IMPORT] src/features/reader/components/FocusCard.jsx is dynamically
imported by src/features/reader/components/FocusBarHost.jsx but also statically imported by
src/features/reader/components/ReaderOverlays.jsx, dynamic import will not move module into
another chunk.
```

The card is therefore in the entry-adjacent chunk regardless of the lazy import. This does not
break behaviour, but it means the lazy boundary in `FocusBarHost` buys nothing until the reader
overlay also lazy-loads the card.

## Tests

- `src/features/reader/hooks/useReadingLens.test.js` - 29 cases, including consent
  short-circuit, quota, abort, and CSS source assertions
- `src/features/reader/components/FocusCard.test.jsx` - static SSR markup plus
  computed-style assertions read from `src/styles/reading-lens.css`
- `tests/e2e/reading-lens.spec.js` - 2 cases at 320px and 390px: the card stays inside
  the viewport, the drag handle moves it, and there is no horizontal overflow

## Related

- [[Reading Lens Bar]] for the draggable bar that shares this engine
- [[Backend Endpoints]] for the `POST /api/reading-lens` contract
- [[Privacy Model]] for the egress rule this feature exists to enforce
- [[Sentence-Paced Scroll]] for the single-ticker rule
- [[Invariants]] for the privacy and focus rules this card must respect
- [[File Placement Map]] for naming and placement
- [[Reader Engine MOC]]