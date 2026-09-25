---
title: Figma Inspection Evidence
type: evidence
status: verified
updated: 2026-09-25
tags: [bookflow, ux, figma, evidence]
source-files: []
---

# Figma Inspection Evidence

Read-only Figma file/node fetch completed 2026-09-25. Measurements below are values returned by
that fetch, primarily `absoluteBoundingBox` plus explicit layout properties. They are design
reference evidence, not Bookflow runtime measurements.

## Reviewed files

| Reference | File key | Inspected version | Selected nodes |
| --- | --- | --- | --- |
| Scrollbar Kit MacOS & Windows (Community) | `P3q0Sh8EB8X5RohRRKZi9m` | `2402796419845960854` | `0:1`, `1:49`, `5:57`, `5:125`, `5:910`, `5:835`, `5:928`, `5:849` |
| iOS 14 UI Kit for Figma (Community) | `pVgvrD6Wpi3VrjnTsyorIm` | `2402793645297850125` | `0:1`, `362:14390`, `362:14628`, `362:15609`, `362:15726`, `362:16094`, `362:16285`, `362:16324`, `362:16339`, `371:13138` |

Node IDs use the Figma API colon form; Figma URLs render the same IDs with hyphens.

## Measured values

| File key / node | Measured evidence |
| --- | --- |
| `P3q0Sh8EB8X5RohRRKZi9m` / `0:1` | Components canvas; child `1:49` is the classic component set `531 x 182` and child `5:57` is the custom set `254 x 182`. |
| `P3q0Sh8EB8X5RohRRKZi9m` / `5:125` | Overview canvas with three showcase frames: `5:910` and `5:835` are `1000 x 346`; `5:928` is `1000 x 346`. |
| `P3q0Sh8EB8X5RohRRKZi9m` / `1:49` | Classic variants are `17 x 150` for Windows and `12 x 150` for Mac vertically; horizontal variants are `150 x 17` and `150 x 12`. |
| `P3q0Sh8EB8X5RohRRKZi9m` / `5:57` | Custom variants are `8 x 150` vertically and `150 x 8` horizontally. |
| `P3q0Sh8EB8X5RohRRKZi9m` / `5:910` | Windows classic showcase frame is `1000 x 346`; its child instances include `17 x 150` and `150 x 17` scrollbars. |
| `P3q0Sh8EB8X5RohRRKZi9m` / `5:835` | Mac classic showcase frame is `1000 x 346`; its child instances include `12 x 150` and `150 x 12` scrollbars. |
| `P3q0Sh8EB8X5RohRRKZi9m` / `5:928` | Custom showcase frame is `1000 x 346`; its child instances are `8 x 150` or `150 x 8`. |
| `P3q0Sh8EB8X5RohRRKZi9m` / `5:849` | Overview title instance is `2064 x 62`. |
| `pVgvrD6Wpi3VrjnTsyorIm` / `362:14390` | Lockscreen frame is `878 x 2839`; its header instance is `846 x 196`. |
| `pVgvrD6Wpi3VrjnTsyorIm` / `362:14628` | Keyboard frame is `878 x 2489`. |
| `pVgvrD6Wpi3VrjnTsyorIm` / `362:15609` | Status Bar & Home Indicator frame is `598 x 1857`; the iPhone X group is `407 x 943`. |
| `pVgvrD6Wpi3VrjnTsyorIm` / `362:15726` | Top Nav. Bar frame is `638 x 6062`; its search-field group is `375 x 439`. |
| `pVgvrD6Wpi3VrjnTsyorIm` / `362:16094` | Home Indicator group is `134 x 5` with corner radius `100`; its rectangle has the same box and radius. |
| `pVgvrD6Wpi3VrjnTsyorIm` / `362:16285` | Notifications frame is `878 x 2371`; notification component set `362:16324` is `391 x 276`, uses `16` padding and `32` item spacing, and its light instance is `359 x 106` with radius `13`. |
| `pVgvrD6Wpi3VrjnTsyorIm` / `371:13138` | Share Sheet frame is `878 x 2092`; action row is `375 x 191` and action-row group is `375 x 558`. |
| `pVgvrD6Wpi3VrjnTsyorIm` / `0:1` | The fetched file version contains no AirDrop node in the reviewed current tree; the older AirDrop measurements are not carried forward. |

## State finding

The current fetched Figma versions expose light/dark, pressed, selected, device, and orientation
variants. No Figma hover state was present in the reviewed component names, variant properties,
or fetched node names. Bookflow hover behavior is therefore an enhancement beyond these Figma
references, not a copied Figma state; it remains restrained and must not change reading focus.

## Bookflow implementation mapping

The measured geometry is mapped to semantic tokens in `src/styles.css`: custom scrollbar track `8px`, thumb `8px`, minimum vertical length `33px`, radius `100px`, and card radius `13px`. The iOS reference contributes `44px` minimum controls, subtle separators, and restrained edge highlights. Three.js remains limited to the existing ambient atmosphere layer. Tailwind utilities are enabled without preflight and must not introduce a second visual token system. Functional progress/focus gradients remain separate from decorative card surfaces.

## Runtime evidence

A generated 420-page native-text PDF was imported through Playwright at `390 x 844`. Progress was monotonic from `5%` through a visible `100%`, the reader opened afterward, horizontal overflow was zero, and two chapter sections were mounted. The probe completed in approximately `3.7s` in the local test environment. This is a single measured run, not a published p50/p95 benchmark.

Related: [[UX Playbook MOC]], [[Navigation and Controls]], [[Design Tokens]], [[Current State Matrix]].
