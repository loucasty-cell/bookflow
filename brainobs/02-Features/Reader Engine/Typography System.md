---
title: Typography System
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, reader, typography, accessibility]
source-files: [src/features/reader/config.js, src/features/reader/components/SettingsPanel.jsx, src/styles.css]
---

# Typography System

Reader typography is controllable because reading comfort is personal and, for some readers,
clinical. The settings panel exposes typeface, size, line height, measure, tracking, and focus
pace.

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
| Text size | `fontSize` | `17` to `24` px (`FONT_SIZE_MIN`/`MAX`) | `19` |
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

Detail: [[Storage and Persistence]], [[Design Tokens]].

## Editorial typography

Beyond the adjustable settings, the reader supports editorial styling for documents that carry
emphasis markers and for chapter openings:

| Element | Effect |
| --- | --- |
| Drop cap | Styled first letter on a chapter opening paragraph |
| `.kw` | Subtle keyword highlight |
| `.pullq` | Indented italic pull quote with an accent border |
| `.insight-box` | Structured callout container for takeaway content |

## Constraints

- Never let inactive text become unreadable at any intensity.
- Never rely on colour alone to convey the active unit. Weight and edge treatment also apply.
- Keep 44 by 44 CSS pixel minimum targets for the settings controls themselves.
- Text must remain readable at 320px width with no horizontal overflow.

Detail: [[Accessibility Rules]], [[Responsive Breakpoints]].