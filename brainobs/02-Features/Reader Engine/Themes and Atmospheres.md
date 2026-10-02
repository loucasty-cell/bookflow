---
title: Themes and Atmospheres
type: feature
status: verified
updated: 2026-10-02
tags: [bookflow, reader, themes, design]
source-files: [src/styles/themes.css, src/styles/themes-overrides.css, src/features/reader/config.js, src/features/reader/components/SettingsPanel.jsx, src/styles/reader.css, index.html]
---

# Themes and Atmospheres

Atmosphere is chosen by reading context: daylight, night, or low-glare. Themes are token swaps, not
per-theme component forks, so every component follows automatically.

## Exactly five themes

`theme` in settings accepts exactly these five identifiers, and no others:

| Setting id | Named theme | Character |
| --- | --- | --- |
| `paper` | Atelier Paper | Default warm reading canvas, light |
| `dusk` | Midnight Vault | Near-black OLED dark canvas |
| `kyoto` | Kyoto Mist | Zen bamboo linen and slate |
| `monocodex` | Monospace Codex | Monospace terminal / CRT phosphor |
| `remix` | Sepia Remix | Warm sepia remix |

`paper` is the default (`config.js:11`).

This is enforced, not documented by convention. `index.html:45` builds
`const validThemes = new Set(["paper", "dusk", "kyoto", "monocodex", "remix"])` and only applies a
persisted theme that is in that set. So an unknown id from an old or corrupted storage payload is
discarded at bootstrap rather than producing an unstyled or half-themed shell.

## The two-stylesheet split

| File | Owns |
| --- | --- |
| `src/styles/themes.css` | Shell plumbing: token declarations, theme switching mechanics, surface layering |
| `src/styles/themes-overrides.css` | The named per-theme overrides, in document order: Atelier Paper, Midnight Vault, Kyoto Mist, Monospace Codex, Sepia Remix |

`scripts/security/contrast.mjs` reads `src/styles/tokens.css`, `src/styles/themes.css`, and
`src/styles/themes-overrides.css` together, which is why the split is a convention the gate depends
on rather than an arbitrary division.

## Bootstrap order

The theme is resolved before first paint:

```text
1  localStorage["bookflow:settings"]  ->  read theme
2  localStorage["bookflow-reader-storage"]  ->  fallback
3  neither -> default paper
```

`useReaderPersistence.js:22` mirrors settings into `bookflow:settings` and `:24` writes the resolved
theme onto `documentElement`, so the shell never flashes the wrong atmosphere on a reload.

## Brand role colours

| Role | Value | Usage |
| --- | --- | --- |
| Primary filler | `#507B9C` | Brand structure, controls |
| Focus colour | `#C2DCFF` | Active paragraph highlight |
| Interaction accent | `#E3242B` | Focus edge, progress, active details |

The concrete hex values for surface and ink per theme live in `themes-overrides.css`. Quote a
specific value only by reading it from that file for the theme in question; the table above is role
level, not a per-theme token dump.

## Dusk design intent

Near-black is a deliberate accessibility choice, not an aesthetic default:

- Dark surfaces reduce luminance in low light without a pure-black OLED smear.
- Reading card sits slightly above the canvas so depth is readable at night.
- Text is light grey rather than pure white to reduce halation.

## Contrast requirements

- Prose must meet WCAG AAA against its own surface where the gate measures it.
- Muted text must remain legible, not decorative.
- Never rely on hue alone for the active state. Weight and edge treatment carry the signal too.
- Never make blur or transparency required for legibility.

Measured 2026-10-02: `node scripts/security/contrast.mjs` reports `pairs checked: 63, skipped: 11`
across all five themes and `PASS: 63 token pairs meet their WCAG threshold`. Re-run the command for a
current number rather than copying this one.

## Anti-patterns

| Do not | Why |
| --- | --- |
| Pure black canvas with pure white text | Halation and eye strain |
| Low-contrast grey prose for "calm" | Reads as disabled content |
| Theme-specific component forks | Token swaps should be sufficient |
| Animated theme transitions on scroll | Distracting and ignores reduced motion |

## Switching

Theme changes are instant token swaps. The landing page exposes a light/dusk toggle, and the reader
settings panel exposes the full theme selector. The transition honours
`prefers-reduced-motion`.

Detail: [[Design Tokens]], [[Motion and Transitions]], [[Accessibility Rules]], [[Typography System]], [[Reader Engine MOC]].