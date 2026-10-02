---
title: Design Tokens
type: reference
status: verified
updated: 2026-10-02
tags: [bookflow, ux, design, tokens, css]
source-files: [src/styles/tokens.css, src/styles/tailwind.css, src/styles.css, src/styles/themes.css, src/styles/themes-overrides.css, src/styles/reader.css, src/shared/motion/presets.js, scripts/security/contrast.mjs, reactUIUXcover.md, frontendskills.md]
---

# Design Tokens

The design system lives as CSS custom properties. Components consume tokens; a raw hex or a
magic pixel value in a component is a defect to fix.

## Where the tokens actually live

`src/styles.css` is a 13-line `@import` manifest and nothing else. It contains no token values.
Adding a token to `src/styles.css` does nothing.

| Concern | File |
| --- | --- |
| Token definitions, `@font-face`, global resets, `.skip-link` | `src/styles/tokens.css` |
| Theme shell plumbing and the paper, dusk, remix blocks | `src/styles/themes.css` |
| Per-theme named overrides for all five themes | `src/styles/themes-overrides.css` |
| Reader font stacks and letter-tracking steps | `src/styles/reader.css` |
| Tailwind bridge, not a token system | `src/styles/tailwind.css` |
| JS mirror of the duration and easing tokens | `src/shared/motion/presets.js` |

`src/styles/tokens.css` is 150 lines: the `New Romantics` `@font-face` block, then `:root` with
the token families below, then the global resets and `.skip-link`.

## Token families in `src/styles/tokens.css`

| Family | Members |
| --- | --- |
| Type | `--font-system`, `--font-ios`, `--font-reading` |
| Brand | `--brand-blue`, `--brand-soft`, `--brand-red`, `--brand-navy`, `--brand-royal`, `--brand-wine`, `--brand-cream` |
| Spacing | `--space-1` through `--space-16` |
| Radius | `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-card`, `--radius-full` |
| Control | `--control-size` |
| Scrollbar | `--scrollbar-track-size`, `--scrollbar-thumb-size`, `--scrollbar-thumb-min-length`, `--scrollbar-radius` |
| Shadow | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| Hairline | `--hairline` |
| UI scale | `--ui-text`, `--ui-label`, `--ui-title` |
| Motion | `--spring`, `--duration-micro`, `--duration-short`, `--duration-medium`, `--duration-enter`, `--ease-emphasized`, `--ease-enter` |
| Safe area | `--safe-top`, `--safe-bottom`, `--safe-left`, `--safe-right` |

```text
--space-1   4px      --space-2   8px      --space-3   12px     --space-4   16px
--space-5   20px     --space-6   24px     --space-8   32px     --space-10  40px
--space-12  48px     --space-16  64px
```

```text
--radius-xs   6px      --radius-sm    10px     --radius-md    14px
--radius-lg   18px     --radius-xl    24px     --radius-card  13px
--radius-full 999px
```

```text
--control-size  44px
--hairline      0.5px
--ui-text       13px    --ui-label  11px    --ui-title  15px
```

```text
--shadow-sm   0 1px 2px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.06)
--shadow-md   0 4px 14px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.1)
--shadow-lg   0 8px 22px rgba(0, 0, 0, 0.1), 0 24px 70px rgba(0, 0, 0, 0.16)
```

## Motion tokens

```text
--spring              cubic-bezier(0.25, 0.46, 0.45, 0.94)
--duration-micro      120ms
--duration-short      220ms
--duration-medium     320ms
--duration-enter      380ms
--ease-emphasized     cubic-bezier(0.2, 0.8, 0.2, 1)
--ease-enter          cubic-bezier(0.16, 1, 0.3, 1)
```

`src/shared/motion/presets.js` mirrors the same values for JS consumers as `motionPresets`
(`springSoft`, `springSheet`, `fade`, `page`) plus `reducedTransition = { duration: 0.01 }`. Its
header states it is the single source and that new easings must not be inlined at call sites.

Detail: [[Motion and Transitions]].

## Themes

Five themes are valid: `paper`, `dusk`, `kyoto`, `monocodex`, `remix`. `src/styles/themes.css`
owns `.app-shell` plus the `paper`, `dusk`, and `remix` blocks.
`src/styles/themes-overrides.css` owns the per-theme named overrides for "Atelier Paper",
"Midnight Vault", "Kyoto Mist", "Monospace Codex", and "Sepia Remix".

The bootstrap in `index.html` validates the persisted theme against exactly
`["paper","dusk","kyoto","monocodex","remix"]` and reads `bookflow:settings` first, then
`bookflow-reader-storage`. `monocodex` is the terminal theme and forces a monospace family.

There is no `tint` theme. Any note or settings copy referring to one is describing something that
does not exist.

Detail: [[Themes and Atmospheres]], [[Graphics Quality Tiers]].

## Typography

`tokens.css` defines the three font stacks. The four selectable reader faces and the three
tracking steps are in `src/styles/reader.css`, keyed by `data-font` and `data-letter-spacing` on
`.reader-canvas`.

| `data-font` | Stack |
| --- | --- |
| `serif` | Georgia, Cambria, Times New Roman, Times |
| `sans` | -apple-system, SF Pro Text, Segoe UI, Roboto |
| `hyperlegible` | Atkinson Hyperlegible, then the sans stack |
| `dyslexic` | OpenDyslexic, Comic Sans MS, -apple-system |

| `data-letter-spacing` | `--reader-tracking` |
| --- | --- |
| `normal` | `0.002em` |
| `wide` | `0.035em` |
| `spacious` | `0.07em` |

Detail: [[Typography System]].

## The 12-file stylesheet map

`src/styles.css` imports these twelve in a fixed order. Order matters: `tokens.css` first so
every later sheet can read a custom property, and `motion.css` after the sheets it needs to
clamp.

```text
1  tokens.css             tokens, @font-face, resets, .skip-link
2  tailwind.css           utility layer bridge
3  landing.css            landing page layout and tokens
4  themes.css             theme shell plumbing
5  reader.css             reader canvas, typography, focus rail
6  responsive.css         the breakpoint media queries
7  motion.css             global reduced-motion and reduced-transparency clamps
8  components.css         shared component surfaces
9  themes-overrides.css   per-theme named overrides
10 landing-components.css landing sub-components
11 reader-extras.css      reader overlays and secondary surfaces
12 reading-lens.css       Reading Lens panel and card
```

Line 1 of `src/styles.css` also imports `lenis/dist/lenis.css` from the package, ahead of the
twelve. The only CSS import in the entry is `import './styles.css'` at `src/main.jsx:5`, so
cascade order is fully determined by the manifest above.

Feature-local stylesheets are imported by their own feature rather than through the manifest:
`src/features/library/library.css`, `src/features/lens-bar/lens-bar.css`,
`src/features/widgets/lib/widgets.css`, `src/components/capsule.css`, and
`src/components/intervention.css`.

## Tailwind is not the token system

`src/styles/tailwind.css` is 10 lines. It imports `tailwindcss/theme.css` and
`tailwindcss/utilities.css`, declares `@source "../**/*.{js,jsx}"`, and bridges four theme
colours into Tailwind's namespace: `--color-bookflow-blue`, `--color-bookflow-red`,
`--color-bookflow-navy`, `--color-bookflow-cream`.

It is a utility layer that can see the brand colours, not a place to define tokens. A new
semantic token goes in `tokens.css`; a Tailwind colour is only acceptable when it is one of the
four bridged brand values.

## Token rules

| Rule | Reason |
| --- | --- |
| No raw hex in components | Themes are token swaps, not component forks |
| No magic spacing | The scale exists so rhythm is consistent |
| No theme-specific component branches | If a branch is needed, the token set is incomplete |
| No blur required for legibility | Transparency must degrade gracefully |
| Active state never colour-only | Accessibility and colour-blind safety |

## Adding a token

```text
1  Add the custom property to the :root block in src/styles/tokens.css
2  Mirror it in every theme that overrides it, in themes.css or themes-overrides.css
3  Verify contrast in each theme
4  Update this note and its updated field
```

A token without a value in every theme produces exactly the theme-specific branching the rules
forbid.

## Verification

- Run `node scripts/security/contrast.mjs`. It parses `tokens.css`, `themes.css`,
  `themes-overrides.css`, and the lens-bar sheet directly, so it cannot drift from a duplicated
  table in a note. Measured 2026-10-02: PASS, 63 pairs checked, 11 skipped as token-absent.
- Inspect computed styles rather than reading the stylesheet alone.
- Confirm no horizontal overflow at 320px.
- Confirm every interactive control resolves to at least `--control-size`, which is 44px.
- Confirm contrast in every theme the settings panel exposes.

Detail: [[Accessibility Rules]], [[Responsive Breakpoints]].