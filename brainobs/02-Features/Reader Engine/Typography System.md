---
title: Typography System
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, reader, typography, accessibility]
source-files: [src/features/reader/config.js, src/features/reader/components/SettingsPanel.jsx, src/features/reader/lib/readerViewport.js, src/styles.css, src/styles/reader.css, src/styles/themes.css, src/styles/themes-overrides.css]
---

# Typography System

Reader typography is controllable because reading comfort is personal and, for some readers,
clinical. The settings panel exposes typeface, size, line height, measure, tracking, and focus pace.

## Defaults

All defaults live in one object, `DEFAULT_SETTINGS` in `src/features/reader/config.js:4`:

```js
{ fontSize: 19, lineHeight: 1.9, columnWidth: 1040, focusPace: 240,
  focus: 'soft', mode: 'focus', theme: 'paper',
  bionic: false, fontFamily: 'serif', letterSpacing: 'normal' }
```

Note `bionic: false`. Fixation and salience weighting are opt-in; they are never applied to a
default reading session. See [[Bionic Reading]].

## Typefaces

| Setting | Stack | Chosen for |
| --- | --- | --- |
| `serif` (default) | Georgia, Cambria, Times | Long-form literary reading |
| `sans` | System stack: SF Pro, Segoe UI, Roboto | Crisp screen reading |
| `clean` | Atkinson Hyperlegible | High letterform distinction, low vision |
| `dyslexic` | OpenDyslexic | Weighted baselines that resist letter inversion |

## Letter tracking

| Setting | Value | Purpose |
| --- | --- | --- |
| `normal` (default) | `0.002em` | Balanced optical rhythm |
| `wide` | `0.035em` | Reduces character crowding |
| `spacious` | `0.07em` | Maximum separation for dyslexia accommodation |

## Slider ranges

| Control | Setting | Range | Default |
| --- | --- | --- | --- |
| Text size | `fontSize` | `17` to `24` px (`FONT_SIZE_MIN`/`MAX`, `config.js:1-2`) | `19` |
| Line height | `lineHeight` | `1.5` to `2.2` | `1.9` |
| Column width | `columnWidth` | `720` to `1120` px | `1040` |
| Focus pace | `focusPace` | `180` to `420` ms | `240` |

Sliders write straight to settings, which drive CSS variables, so changes appear live without a
re-render cascade.

## Implementation notes

- Defaults live in one place: `DEFAULT_SETTINGS` in `src/features/reader/config.js`.
- The settings store re-merges over defaults, so a new typography option needs no migration.
- Values are applied as CSS custom properties in `styles.css` rather than inline styles on each
  paragraph, which keeps the paragraph tree cheap.
- `readerViewport.js` derives the safe reading box from the font and column settings, with
  `DEFAULT_SAFE_PADDING` of 24 and `DEFAULT_FOCUS_RATIO` aliased from `FOCUS_RAIL_RATIO`.

Detail: [[Storage and Persistence]], [[Design Tokens]].

## Themes as a two-file split

Typography colour and surface tokens are split across two stylesheets, and the reader supports
exactly five themes: `paper`, `dusk`, `kyoto`, `monocodex`, `remix`.

| File | Owns |
| --- | --- |
| `src/styles/themes.css` | Shell plumbing: token declarations, switch mechanics, surface layering |
| `src/styles/themes-overrides.css` | The named per-theme overrides, in order: Atelier Paper, Midnight Vault, Kyoto Mist, Monospace Codex, Sepia Remix |

`index.html` validates any persisted theme against exactly that five-item set before applying it, so
an unknown theme id from an old storage payload cannot brick the shell. Detail in
[[Themes and Atmospheres]].

## Editorial typography

Beyond the adjustable settings, the reader supports editorial styling for documents that carry
emphasis markers. These are classes in `src/styles/reader.css`:

| Class | Line | Effect |
| --- | --- | --- |
| `.kw` | `reader.css:1617` | Subtle keyword highlight |
| `.pullq` | `reader.css:1625` | Indented italic pull quote with an accent border |
| `.insight-box` | `reader.css:1638` | Structured callout container for takeaway content |
| `.insight-box-badge` | `reader.css:1646` | Badge treatment inside the callout |

There is no drop-cap rule anywhere in `src/`. Do not document drop caps as a reader feature.

## Constraints

- Never let inactive text become unreadable at any intensity.
- Never rely on colour alone to convey the active unit. Weight and edge treatment also apply.
- Keep 44 by 44 CSS pixel minimum targets for the settings controls themselves.
- Text must remain readable at 320px width with no horizontal overflow.

`node scripts/security/contrast.mjs` checks the token set mechanically; the measured 2026-10-02
baseline was PASS with 63 checks and 11 skipped.

Detail: [[Accessibility Rules]], [[Responsive Breakpoints]], [[Reader Engine MOC]].