---
title: Reading Lens Bar
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, reading-lens, consent, privacy, drag, feature-flag]
source-files: [src/features/lens-bar/index.js, src/features/lens-bar/components/LensBar.jsx, src/features/lens-bar/components/LensBarMenu.jsx, src/features/lens-bar/components/LensBarLauncher.jsx, src/features/lens-bar/hooks/useDraggableBar.js, src/features/lens-bar/hooks/useLensConsent.js, src/features/lens-bar/hooks/useLensRequest.js, src/features/lens-bar/hooks/useLensTheme.js, src/features/lens-bar/hooks/useSelectionMemory.js, src/features/lens-bar/lib/position.js, src/features/lens-bar/lib/plain.js, src/features/lens-bar/store/lensBarStore.js, src/features/lens-bar/lens-bar.css, src/features/reader/components/ReaderOverlays.jsx]
---

# Reading Lens Bar

A draggable, floating lens that can be summoned anywhere in the reader, opened from the header,
and pointed at the current selection. It shares the Reading Lens engine with the focus card but
has its own consent UX, its own persisted position, and its own theme resolution.

Status: **verified**. Landed on `main` with `feat/lens-bar` (merge `35640d7`). The card half of
this feature is in [[Reading Lens]].

## Why it is a separate feature

`src/features/lens-bar/` owns the bar end to end: components, hooks, geometry, store, and CSS.
The engine that does the talking stays in the reader at `useReadingLens.js`. The split exists
because the two surfaces have genuinely different UX:

| | Focus card | Lens bar |
| --- | --- | --- |
| Opens | on selection | on demand, or from the header launcher |
| Consent UI | one boolean toggle | three explicit choices |
| Position | session only | persisted across reloads |
| Theme | inherits reader theme | resolves its own, portaled to `body` |
| Drag | pointer + arrow keys | pointer + arrow keys, with edge snapping |

The feature is not in the reader barrel. It is consumed by
`ReaderOverlays.jsx`, which imports `../lens-bar/index.js`.

## Consent: three explicit choices

`useLensConsent` exposes `LENS_CONSENT_CHOICES = ["once", "always", "local"]`.

| Choice | Effect |
| --- | --- |
| Send once | allows this single request, then returns to needing a decision |
| Always | remembers the grant for the session |
| Keep local | never sends; the engine answers locally |

`consent.ensure()` returns a promise that parks in a ref until the reader answers, so the caller
never has to know whether a decision is pending. If the component unmounts with a decision
outstanding, the pending promise settles to `false`. That ordering is deliberate: an abandoned
prompt must never resolve to permission.

The bar drives it as `consent.ensure()` before `req.send()` and `consent.consumeOnce()` after.

The card, by contrast, exposes a single boolean toggle. Do not unify them without deciding which
UX the reader should get; they encode different promises. See [[Reading Lens]].

## Egress: the source label is deliberately conservative

`useLensRequest` derives the visible provenance label as:

```js
source: latest?.isLocal === false ? "cloud" : "local"
```

Overstating egress is the one mistake this label must never make, so any ambiguous state falls
to `local`. When the reader chooses **Keep local**, the bar answers with a local reply and
**zero** network requests to `/api/reading-lens`. `tests/e2e/lens-bar.spec.js` asserts exactly
that by counting requests.

## Hostile answers are rendered, never interpreted

`LensBarPanel` is split out of `LensBar.jsx` as a presentational component specifically so it can
be rendered with `renderToStaticMarkup` in a test and its HTML escaping verified directly.
`LensBar` itself renders through `createPortal(..., document.body)` so the bar is never trapped
inside a transformed reader ancestor. The e2e suite feeds a hostile answer and asserts
`window.__pwned` stays `undefined`.

## Dragging

`useDraggableBar` returns `{ ref, gripProps }` and uses a **callback ref** because the bar mounts
after the hook runs.

| Detail | Value | Reason |
| --- | --- | --- |
| Deadzone | 4px | a click on the grip must not start a drag |
| Keyboard step | 12px, 48px with Shift | usable without a pointer |
| Edge snap | 24px | magnetism without trapping |
| Input | Pointer Events + `setPointerCapture` | one path for mouse and touch |
| Bounds | `visualViewport` | correct under mobile browser chrome |

The grip is a real control: `role="button"`, `tabIndex: 0`, and an `aria-label` that describes
the arrow keys and the Shift modifier.

Position math lives in `lib/position.js` as pure functions: `toPixels`, `toRatio`, `clampPx`,
`snapPx`, with `MARGIN = 12` and `DEFAULT_RATIO = { fx: 0.5, fy: 1 }`.

## Theme resolution

The bar is portaled outside the reader, so it cannot inherit theme by DOM position.
`useLensTheme` watches instead:

- a `MutationObserver` on `data-theme` and `class` across `[data-reader-root]`,
  `documentElement`, and `body`
- a `prefers-color-scheme` listener

It resolves to `data-lens-theme="light" | "dark"`, matched by the regex
`/(dusk|dark|night|monocodex)/i`. `monocodex` is dark despite the name.

## Store holds preferences only

`lensBarStore` is deliberately **not** a zustand `persist` store. It reads and writes
`bookflow:lens-bar` by hand. State is `open`, `collapsed`, `ratio`, `mode`, `language`.

The store header states the rule: **preferences only, never a question, an answer, or book
text.** Consent is intentionally absent from it, because consent belongs to `useReadingLens` and
belongs to the session, not to disk.

## Modes

`LensBarMenu` defines six modes in `LENS_MENU_MODES`. The menu flips below 220px from the top
edge so it never renders off-screen, and supports roving arrow-key focus.

## Selection memory

Focusing the bar's input clears the native DOM selection, so `useSelectionMemory` captures the
selection on `selectionchange` before that happens. It keeps at most
`LENS_SELECTION_MEMORY_LIMIT` (6000) characters.

`lib/plain.js` exports `toPlain(value, max = 4000)`, which strips NUL bytes and collapses runs of
three or more newlines. It splits and joins rather than using a regex, because a
control-character regex would trip the `no-control-regex` lint rule.

## Public surface

`src/features/lens-bar/index.js` exports `LensBar`, `LensBarLauncher`, `LensBarMenu`,
`LENS_MENU_MODES`, `useLensConsent`, `LENS_CONSENT_CHOICES`, `detectLensTheme`, `useLensTheme`,
`useSelectionMemory`, `LENS_SELECTION_MEMORY_LIMIT`, `useDraggableBar`, `MAX_CONTEXT`,
`MAX_QUESTION`, `MODE_ACTIONS`, `buildLensCall`, `toLensStatus`, `useLensRequest`, `toPlain`, the
position helpers, `LENS_BAR_MODES`, `LENS_BAR_STORAGE_KEY`, `readLensBarPreferences`, and
`useLensBarStore`.

`LensBarPanel` and the module-local `clamp` are intentionally **not** exported.

## Tests

Unit, 6 files:

| File | Covers |
| --- | --- |
| `LensBar.test.jsx` | static SSR markup and escaping |
| `useLensRequest.test.js` | request assembly, status mapping, provenance label |
| `lensBarStore.test.js` | preference persistence |
| `position.test.js` | clamp, snap, ratio conversion |
| `plain.test.js` | text sanitisation |

Browser, `tests/e2e/lens-bar.spec.js`, 14 cases: opens from the reader and stays in the viewport;
grip is a real button with `maxlength=500`; all three consent choices are offered; **Keep local
issues zero requests**; empty selection is refused; mode switching and the translate-only target
language field; `Escape` collapses and the launcher re-expands; keyboard movement with Shift and
**position persisted across reload**; no horizontal overflow at 320, 390, and 430; reduced motion
honoured; theme resolution; and hostile-answer escaping.

## Invariants

- No passage means no request.
- Keep local means no request, ever.
- No question, answer, or book text is written to the store.
- The bar must stay inside the viewport at 320, 390, 430, and desktop widths.
- A provider key never reaches the browser. All egress goes through the backend.

## Related

- [[Reading Lens]] for the engine and the focus card
- [[Backend Endpoints]] for the `POST /api/reading-lens` contract
- [[Privacy Model]] for the egress rule
- [[Frontend Public APIs]] for the barrel contents
- [[Responsive Breakpoints]] for the 320-430px contract
- [[Invariants]]
- [[Reader Engine MOC]]