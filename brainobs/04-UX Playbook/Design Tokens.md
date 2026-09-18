---
title: Design Tokens
type: reference
status: verified
updated: 2026-09-18
tags: [bookflow, ux, design, tokens, css]
source-files: [src/styles.css, reactUIUXcover.md, frontendskills.md]
---

# Design Tokens

The design system lives as CSS custom properties. Components consume tokens; a raw hex or a
magic pixel value in a component is a defect to fix.

## Colour roles

| Role | Paper | Dusk | Tint |
| --- | --- | --- | --- |
| Surface canvas | `#FFFEFA` | `#0B0F19` | `#F4EFEA` |
| Reading card | `#FFFFFF` | `#121826` | `#FAF7F2` |
| Text ink | `#1B2633` | `#F2F2F7` | `#2D251E` |
| Text muted | `#647384` | `#94A3B8` | `#7A6E65` |
| Brand blue | `#2B5A84` | `#6B9AC4` | `#3A6B94` |
| Brand royal | `#4169E1` | `#5B86E5` | `#4A72E8` |
| Wine accent | `#7B1020` | `#9B2236` | `#8A1828` |

## Brand structure colours

| Role | Value | Usage |
| --- | --- | --- |
| Primary filler | `#507B9C` | Brand structure and controls |
| Focus colour | `#C2DCFF` | Active paragraph highlight |
| Interaction accent | `#E3242B` | Focus edge, progress, active details |

## Spacing scale

```text
--space-1   4px      --space-2   8px      --space-3   12px     --space-4   16px
--space-5   20px     --space-6   24px     --space-8   32px     --space-10  40px
```

## Corner radii

```text
--radius-sm    10px      --radius-md    14px      --radius-lg    18px
--radius-xl    24px      --radius-full  999px
```

## Shadow elevations

```text
--shadow-sm   0 1px 3px rgba(23, 29, 58, 0.08)
--shadow-md   0 10px 30px rgba(23, 29, 58, 0.10)
--shadow-lg   0 24px 70px rgba(23, 29, 58, 0.16)
```

## Motion tokens

```text
--spring              cubic-bezier(0.25, 0.46, 0.45, 0.94)
--duration-micro      120ms
--duration-short      220ms
--duration-medium     320ms
```

## Typography tokens

| Token set | Values |
| --- | --- |
| Serif | Georgia, Cambria, Times |
| Sans | SF Pro, Segoe UI, Roboto |
| Clean | Atkinson Hyperlegible |
| Dyslexic | OpenDyslexic |

Letter tracking: `normal` `0.002em`, `wide` `0.035em`, `spacious` `0.07em`.

Detail: [[Typography System]].

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
1  Add the custom property to src/styles.css in the relevant token block
2  Define its value for every theme (paper, dusk, and any other exposed theme)
3  Verify contrast in each theme
4  Update this note and its updated field
```

A token without a value in every theme produces exactly the theme-specific branching the rules
forbid.

## Verification

- Inspect computed styles rather than reading the stylesheet alone.
- Confirm no horizontal overflow at 320px.
- Confirm every interactive control is at least 44 by 44 CSS pixels.
- Confirm contrast in every theme the settings panel exposes.

Detail: [[Accessibility Rules]], [[Responsive Breakpoints]], [[Themes and Atmospheres]].