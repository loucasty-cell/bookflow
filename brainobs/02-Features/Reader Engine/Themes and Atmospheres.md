---
title: Themes and Atmospheres
type: feature
status: verified
updated: 2026-09-18
tags: [bookflow, reader, themes, design]
source-files: [src/styles.css, src/features/reader/config.js, src/features/reader/components/SettingsPanel.jsx]
---

# Themes and Atmospheres

Atmosphere is chosen by reading context: daylight, night, or low-glare. Themes are token
swaps, not separate stylesheets, so every component follows automatically.

## Atmosphere table

| Role | Paper (light) | Dusk (near-black) | Tint (remix) |
| --- | --- | --- | --- |
| Surface canvas | `#FFFEFA` | `#0B0F19` | `#F4EFEA` |
| Reading card | `#FFFFFF` | `#121826` | `#FAF7F2` |
| Text ink | `#1B2633` | `#F2F2F7` | `#2D251E` |
| Text muted | `#647384` | `#94A3B8` | `#7A6E65` |
| Brand blue | `#2B5A84` | `#6B9AC4` | `#3A6B94` |
| Brand royal | `#4169E1` | `#5B86E5` | `#4A72E8` |
| Wine accent | `#7B1020` | `#9B2236` | `#8A1828` |

## Brand role colours

| Role | Value | Usage |
| --- | --- | --- |
| Primary filler | `#507B9C` | Brand structure, controls |
| Focus colour | `#C2DCFF` | Active paragraph highlight |
| Interaction accent | `#E3242B` | Focus edge, progress, active details |

## Theme identifiers

`theme` in settings accepts: `paper` (default), `dusk`, plus the additional palettes recorded
in the interface contract (`kyoto`, `monocodex`, `remix`). Verify which are exposed in the
current settings panel before documenting a specific one as user-facing.

## Dusk design intent

Near-black is a deliberate accessibility choice, not an aesthetic default:

- Dark surfaces reduce luminance in low light without a pure-black OLED smear.
- Reading card sits slightly above the canvas so depth is readable at night.
- Text is light grey rather than pure white to reduce halation.

## Contrast requirements

- Prose must meet WCAG AAA against its own surface.
- Muted text must remain legible, not decorative.
- Never rely on hue alone for the active state. Weight and edge treatment carry the signal too.
- Never make blur or transparency required for legibility.

## Anti-patterns

| Do not | Why |
| --- | --- |
| Pure black canvas with pure white text | Halation and eye strain |
| Low-contrast grey prose for "calm" | Reads as disabled content |
| Theme-specific component forks | Token swaps should be sufficient |
| Animated theme transitions on scroll | Distracting and ignores reduced motion |

## Switching

Theme changes are instant token swaps. The landing page exposes a light/dusk toggle, and the
reader settings panel exposes the full theme selector. The transition honours
`prefers-reduced-motion`.

Detail: [[Design Tokens]], [[Motion and Transitions]], [[Accessibility Rules]].