---
title: Command Palette
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, reader, accessibility, keyboard, navigation]
source-files: [src/features/reader/components/CommandPalette.jsx, src/features/reader/components/CommandPalette.test.jsx, src/features/reader/components/ReaderPage.jsx, src/features/reader/lib/progressLabel.js, src/features/reader/lib/progressLabel.test.js, src/features/reader/hooks/useReaderInput.js, src/shared/lib/focusManagement.js, src/styles/reader-extras.css]
---

# Command Palette

A `Ctrl`/`Cmd` + `K` overlay that reaches every reader control without leaving the paragraph, and
the progress-display preference it ships alongside.

Status: **verified**. Landed on `main` in `1b9bf1d`.

## The hotkey

`ReaderPage.jsx:136` opens the palette on `Ctrl`/`Cmd` + `K`:

```js
if (!(event.metaKey || event.ctrlKey) || event.key?.toLowerCase() !== "k") return;
```

It is bound at the reader level rather than inside the palette, so the key works whether or not a
panel is open. On macOS both `metaKey` and `ctrlKey` are accepted deliberately; the reader does
not branch on platform.

## One focus trap, not two

`CommandPalette` does not implement focus containment, `Escape`, or focus restoration. It
delegates all three to `useModalFocus` from `src/shared/lib/focusManagement.js`, the same hook
the notes and settings overlays use. That is the point: one implementation, so a fix to the trap
fixes every overlay.

| Concern | Owner |
| --- | --- |
| Initial focus | `useModalFocus` focuses the input on open |
| Tab cycling | `useModalFocus` |
| `Escape` to close | `useModalFocus` |
| Focus restoration on close | `useModalFocus` returns focus to the opener |

The panel itself is `role="dialog"` with `aria-modal="true"` and
`aria-label="Reader commands"`. The backdrop is `role="presentation"` and closes on click; the
panel stops propagation so an inside click does not dismiss it.

## The query never leaves the component

The search text is local React state. It is never logged, stored, or sent. There is no analytics
hook on the palette, and adding one would break the privacy invariant in [[Invariants]].

The query is reset to `""` whenever the palette closes, so a later open never shows a stale
filter.

## Filtering is a pure function

`filterCommands(commands, query)` is exported separately from the component precisely so it can be
unit tested without a DOM.

```js
export function filterCommands(commands, query) {
  const list = Array.isArray(commands) ? commands : [];
  const needle = typeof query === "string" ? query.trim().toLowerCase() : '';
  if (!needle) return list;
  return list.filter((command) => {
    if (!command) return false;
    const label = typeof command.label === 'string' ? command.label.toLowerCase() : '';
    const keywords = Array.isArray(command.keywords)
      ? command.keywords.map((word) => String(word).toLowerCase())
      : [];
    return label.includes(needle) || keywords.some((word) => word.includes(needle));
  });
}
```

Properties worth preserving: a non-array input yields `[]` instead of throwing, an empty query
returns the original list untouched, and matching is substring-based over both `label` and
`keywords` so a command can be found by a synonym the label never shows.

### The lint warning this causes

`CommandPalette.jsx` exports both a component and a function, which trips
`react-refresh/only-export-components`. This is the single warning in `npm run lint`:

```text
12:17  warning  Fast refresh only works when a file only exports components
```

It is left in place deliberately. Splitting `filterCommands` into its own module would satisfy
the linter at the cost of an extra file for one 12-line pure function, and the file-level comment
explains why it is exported. The alternative fix, an eslint-disable comment, was not taken
because a suppression hides the next real violation of the same rule.

## Progress display ships with it

The same commit added a reader preference for what the header progress label says.

`progressLabel.js` exports `PROGRESS_DISPLAY_MODES = ["percent", "time-left-chapter", "hidden"]`,
`DEFAULT_PROGRESS_DISPLAY = "percent"`, `normalizeProgressDisplay`, `getMeasuredPace`,
`getChapterMinutesLeft`, and `getProgressLabel`.

`getMeasuredPace` returns `null` below `MIN_SAMPLES_FOR_CONFIDENCE`, so the time-left label
degrades to nothing rather than quoting a confident number it cannot support. That is the honest
failure mode.

The module header states the reasoning for having no page numbers: **the reader has no page
concept.** Progress is derived from paragraph position, so any page label would be a fiction.

The setting lives in `DEFAULT_SETTINGS` as `progressDisplay` and is persisted through the reader
store. See [[Storage and Persistence]].

## Backlog consequence

`Backlog P0-P1-P2` previously listed "time left in chapter" as open work attributed to
`ReaderPage.jsx` with no `TODO(backlog-…)` marker in that file. The reason there is no marker is
that the work shipped. The stale backlog row was removed. See [[Backlog P0-P1-P2]].

## Tests

- `CommandPalette.test.jsx` - static SSR markup: dialog semantics, `aria-modal`, the accessible name
- `progressLabel.test.js` - 21 cases over the three display modes, the confidence floor, and normalisation of an invalid stored value
- No DOM environment is installed. Component assertions are made against `renderToStaticMarkup`

## Related

- [[Navigation and Controls]] for the full keyboard map
- [[Reading Lens]] and [[Reading Lens Bar]] for the other reader overlays
- [[Design Tokens]] for the palette's surface tokens
- [[Accessibility Rules]] for the focus-trap requirement
- [[Backlog P0-P1-P2]]
- [[Reader Engine MOC]]