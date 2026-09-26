---
title: Figma Inspection Evidence
type: evidence
status: verified
updated: 2026-09-26
tags: [bookflow, ux, figma, evidence]
source-files: [src/features/reader/components/FocusCard.jsx, src/features/reader/components/NotesPanel.jsx, src/features/reader/hooks/useReadingLens.js, src/features/reader/hooks/useReaderSelection.js, src/styles/reader.css, src/styles/reader-extras.css, src/styles/tokens.css]
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
| AI Agent UI Kit - Reasoning, Tool Use & Response Components (Community) | `dhrZUoqIQzKnKQiADT3C1N` | current fetch 2026-09-25 | `70:967`, `70:985`, `70:2146`, `70:2482`, `70:2542`, `70:2601`, `70:2678`, `70:3111`, `70:3135`, `65:553`, `64:911`, `67:573`, `78:590` |
| Apple Widgets UI Kit (Community) | `zST5IOFYB6MgjnwAzpMxNt` | fetch 2026-09-26 | `6:59` root canvas, 83 components extracted across `appleSmallMedium`, `appleLarge`, `productivity`, `parts` |
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

Related: [[UX Playbook MOC]], [[Home Widgets]], [[Navigation and Controls]], [[Design Tokens]], [[Current State Matrix]].

Fetched 2026-09-26 with the Figma MCP. These are the values that `src/features/widgets/lib/tokens.js`
and the four spec files were generated from; see [[Home Widgets]] for how Bookflow binds them.

| Node | Measured evidence |
| --- | --- |
| `6:59` root | Components canvas. 83 components extracted: `appleSmallMedium` 27, `appleLarge` 14, `productivity` 26, `parts` 16. |
| Small bucket | `155 x 155`, corner radius `21.67` |
| Medium bucket | `329 x 155`, corner radius `21.67` |
| Large bucket | `329 x 345`, corner radius `21.67` |
| `parts` set | 16 entries returned root-only, with no child layers, even at `depth: 8`. Recorded as a Figma API limitation rather than inferred children. |

The radius is `21.670000076293945px` in the API response; the tail is float artifact and is stored as `21.67`.

## AI Agent UI Kit measurements

The following values were returned by the Figma MCP fetch and are design references, not Bookflow runtime measurements.

| Node | Measured evidence |
| --- | --- |
| `70:967` Thumbnail | Background asset is `1920 x 1080`; title uses Maitree `140/0.95em`; supporting text uses Maitree `48/1.2em`; content is placed as a chat workspace. |
| `70:985` Add menu | White surface, `20px` padding, `12px` gap, `40px` radius, `2.57px` border, soft shadow. |
| `70:2146` AI Response | Row with `18px` gap; `42px` avatar; content column with `12px` gap; Instrument Sans `24/36px` response text; action row with `3px` gap and `24px` icons. |
| `70:2678` User Message | Column with `8px` gap; bubble padding `24px 32px`, `#EBEEF0` fill, `24px` radius, soft shadow; text `32/48px`; action icons `32px`. |
| `70:2482` Menu/Slash | `334 x 335`; white surface; `10px` padding, `5px` gap, `20px` radius, `1.25px` border; rows use `10px 15px` padding, `15px` gap, `10px` radius; scrollbar `7.5 x 315`, radius `3.75px`. |
| `70:2542` Menu/Model | White surface; `11.2px` padding, `5.6px` gap, `22.4px` radius, `1.4px` border; rows use `11.2px 16.8px` padding, `16.8px` gap, `11.2px` radius. |
| `70:2601` Status list | White surface; `32px` padding, `12px` gap, `40px` radius; status rows are `33.75px` high with `13.5px` gap and `33.75px` icons. |
| `70:3111` Source Chip | White surface; `16px 24px` padding, `24px` gap, `16px` radius, `2px` border; number badge `36px`; title `26/32px`; source `24/32px`. |
| `70:3135` Tool Call | `#F6F7F8` surface; `12px 18px` padding, `18px` gap, `1.5px` border, `18px` radius, soft shadow; icons `30px`; title `21/30px`; status `19.5/24px`. |
| `65:553` / `64:911` / `67:573` variants | Hover states use `28px` avatar, `12px` row gap, `16/24px` text, `16px` icons; running state uses `8px 12px` padding, `12px` gap, `#F6F7F8` fill, `12px` radius, `20px` icons, and `14/20px` plus `13/16px` text. |

### Bookflow mapping

- The `AI Response` and `Tool Call` patterns map to a reading-only assistant response and provider status, not to a general chatbot.
- The `Menu/Slash` pattern maps to quick reading actions: summarize, translate, explain, and a short custom instruction. It must remain selection-scoped.
- The `Source Chip` pattern maps to the selected passage and paragraph location.
- The `Menu/Model` pattern may show provider/fallback status, but must not expose or promise an unreliability-prone free quota.
- Figma values inform spacing, radii, and hierarchy; Bookflow keeps its existing semantic tokens, 44px touch targets, reduced-motion behavior, and zero-overflow rule.



## State finding

The earlier scrollbar and iOS references expose light/dark, pressed, selected, device, and orientation variants, but no hover state was present in those reviewed nodes. The AI Agent UI Kit does expose `State=Hover` and `State=Running` component variants, so its hover and running states are measured references. Bookflow still keeps hover restrained and must not let it change reading focus.

## Bookflow implementation mapping

The measured geometry is mapped to semantic tokens in `src/styles.css`: custom scrollbar track `8px`, thumb `8px`, minimum vertical length `33px`, radius `100px`, and card radius `13px`. The iOS reference contributes `44px` minimum controls, subtle separators, and restrained edge highlights. The AI Agent UI Kit contributes the assistant response rhythm, neutral surfaces, quiet status states, and command-menu hierarchy; its large showcase values must be scaled down for the reader. Three.js remains limited to the existing ambient atmosphere layer. Tailwind utilities are enabled without preflight and must not introduce a second visual token system. Functional progress/focus gradients remain separate from decorative card surfaces.

## Runtime evidence

A generated 420-page native-text PDF was imported through Playwright at `390 x 844`. Progress was monotonic from `5%` through a visible `100%`, the reader opened afterward, horizontal overflow was zero, and two chapter sections were mounted. The probe completed in approximately `3.7s` in the local test environment. This is a single measured run, not a published p50/p95 benchmark.

Related: [[UX Playbook MOC]], [[Navigation and Controls]], [[Design Tokens]], [[Current State Matrix]].
