---
title: Creative Coding and 3D Features
type: research
status: verified
updated: 2026-11-18
tags: [bookflow, 3d, threejs, r3f, creative-coding, visual-design]
source-files: [reports/Three Fiber creative reading features.md,research_notes/Three Fiber creative reading features/3d_feature_ideas.md,research_notes/Three Fiber creative reading features/creative_coding_techniques.md,research_notes/Three Fiber creative reading features/r3f_tech_stack.md,research_notes/Three Fiber creative reading features/ux_evidence_constraints.md]
---

# Creative Coding and 3D Features

An evidence-backed research report and technical roadmap on creative coding, React Three Fiber (R3F),
WebGL, CSS 3D, and procedural art for Bookflow.

The central finding: **Bookflow should keep the reading canvas calm, retain its raw tree-shaken Three.js
layer, and deploy creative visual craft exclusively on landing, library, and stats surfaces.**

---

## 1. The Core Decision: Raw Three Stays; R3F Only as a Lazy Island

Bookflow currently implements its ambient background via `src/shared/components/AmbientDustCanvas.jsx`
using raw `three` (`^0.186.0`) with direct `WebGLRenderer` management.

### 1.1 Measured Bundle Impact

Bundle comparison for a minimal points scene (measured via esbuild gzip benchmarks):

| Stack | Gzip Size | Verdict for Bookflow |
| --- | --- | --- |
| React DOM + raw three (tree-shaken) | **192.9 KB** | **Current approach; keep as default** |
| React DOM + R3F 9.8.1 (`frameloop="demand"`) | **308.3 KB** | +115 KB penalty; lazy island only |
| + drei `PerformanceMonitor`, `AdaptiveDpr`, `Sparkles` | **310.7 KB** | Marginal cost once R3F reconciler is loaded |
| + `@react-three/postprocessing` (Bloom, Vignette) | **334.5 KB** | Avoid; caps three version below r187 |
| `three/webgpu` + TSL minimal | **245.1 KB** | Not justified for subtle ambient effects |
| OGL points | **13.4 KB** | Viable candidate if dust layer is re-platformed |

### 1.2 Architectural Trade-Offs

1. **Namespace Tree-Shaking Loss**: R3F's `<Canvas>` runs `extend(THREE)` over the entire `three` namespace,
   defeating Vite's ability to shake out unused geometry, math, and light types.
2. **Reconciler Coupling**: R3F bundles its own custom reconciler. Each React minor release requires a
   coordinated R3F update. While R3F 9.8.1 supports React 19.0.0, long-term maintenance overhead is high.
3. **Unmaintained Ecosystem Dependencies**: Key helper libraries have stagnated:
   - `@react-three/a11y` was last published in May 2022.
   - `@react-three/offscreen` was last published in May 2023.
   Accessibility must be built via real HTML DOM overlays, not 3D canvas proxies.

**Conclusion**: Do not rewrite existing ambient Three.js into R3F. If an interactive 3D bookshelf or
constellation stats world is built, load R3F exclusively behind a code-split `React.lazy()` boundary.

---

## 2. The Cognitive Evidence Against Decorative Reader Effects

The choice to keep the reader calm is grounded in scientific literature, not subjective taste:

- **Seductive Details Penalty (g = -0.33)**: Rey's 2012 meta-analysis and Sundararajan & Adesope's 2020
  update demonstrated that interesting but irrelevant visual additions reduce reading comprehension
  and transfer by **g = -0.33**. Background rain shaders or ambient particle fields behind body text
  actively damage reader learning.
- **Screen Reading Deficit (g = -0.21)**: Delgado et al. (2018) pooled 54 studies with 171,055 participants,
  finding that digital screen reading trails print reading comprehension by **g = -0.21**. This penalty
  is magnified under time pressure and for expository texts.
- **Audio Interference**: Vasilev, Kirkby & Angele (2018) conducted a Bayesian meta-analysis of 65 studies,
  finding background music, speech, and lyrics reliably disrupt reading. Only white/pink noise showed a
  targeted benefit (**g = 0.249**) specifically for individuals with ADHD symptoms (OHSU 2023).
- **Vestibular & Motion Sensitivities**: NHANES data indicates that 35.4% of US adults aged 40+ experience
  vestibular dysfunction. Parallax camera movements and continuous 3D rotations can induce motion
  sickness (visually induced motion sickness / simulator sickness).

**Rule**: All body text must remain unadorned React text nodes. Animated effects require an immediate
pause mechanism (WCAG 2.2.2) and must respect `prefers-reduced-motion` (WCAG 2.3.3).

---

## 3. High-Value Zero-Cost Primitives: Browser APIs & GSAP

The most impactful creative enhancements require zero new dependencies:

### 3.1 CSS Custom Highlight API
- Supported across modern browsers (Chrome 105+, Firefox 140+, Safari 17.2+).
- Styles arbitrary DOM `Range` selections using `::highlight(name)`.
- **Architectural Value**: Enables rich margin notes, search term highlights, and read-aloud word
  tracking without injecting `<span>` tags into the document tree. Bookflow's core invariant ("React text
  nodes only") remains completely intact.

### 3.2 View Transitions API
- Same-document transitions supported in Chrome 111+, Firefox 144+, Safari 18+.
- Provides a shared-element animation where a book thumbnail on the library shelf or landing hero
  smoothly lifts off and morphs into the reader surface.
- Reverts to an instantaneous cut when `prefers-reduced-motion: reduce` is active.

### 3.3 GSAP Plugin Capabilities (Already in `package.json`)
Bookflow already ships `gsap ^3.15.0`. Formerly commercial GSAP plugins are now free under the standard
license:
- **DrawSVG (2.2 KB gzip)**: SVG path tracing for inking achievement badge emblems upon unlock.
- **MorphSVG (9.6 KB gzip)**: Morphing bookmark icons between active and inactive states.
- **SplitText (3.7 KB gzip)**: Kinetic typography for chapter header cards (opt-in; children `aria-hidden`).

### 3.4 Hash-Seeded Procedural Covers
- Local-first reading applications lack network cover art fetches.
- Following the NYPL Labs (2014) generative ebook cover lineage, a deterministic seed is computed from
  the book's title and author strings:
  `seed = hashString(title + author)`.
- Procedural SVG / Canvas 2D patterns generate balanced palettes, geometric layouts, and cover art
  locally in under 2 milliseconds without any network request.

---

## 4. The 20-Feature Surface and Ergonomics Matrix

Every feature is classified by its surface, default state, bundle cost, and accessibility guarantee:

| Feature | Surface | Default | Cost | Accessibility & Fallback |
| --- | --- | --- | --- | --- |
| **Custom Highlight API** | Reader | On (functional) | 0 KB | Zero DOM mutation; text flow intact |
| **View Transition (Shelf to Reader)**| Library/Reader | On (subtle) | 0 KB | Instant swap under reduced-motion |
| **Scroll-driven chapter hairline** | Reader | On (progressive)| 0 KB | Decorative; JS focus rail stays source |
| **Procedural hash-seeded covers** | Library, resume | On | ~0 KB | Title in DOM text; art `aria-hidden` |
| **Thinned page-block progress** | Resume card | On (SVG) | 0 KB | Numeric progress percentage alongside |
| **Streak calendar (53x7 grid)** | Stats | On (no-loss) | ~5 KB | Full table and text alternative |
| **Per-book reading fingerprint** | Stats, recap | On | ~0 KB | SVG rose glyph; exportable locally |
| **Pace ribbon (WPM over chapters)**| Stats | On | ~4 KB | Informational; accessible text summary |
| **DrawSVG badge inking** | BadgeGallery | Opt-in | 2.2 KB | Static unlocked glyph under reduced-motion |
| **MorphSVG bookmark icon** | Reader icon | On | 9.6 KB | Semantic button label; state announced |
| **Kinetic chapter title card** | Reader break | Opt-in | 3.7 KB | `aria-label` on parent; split `aria-hidden`|
| **Static paper grain texture** | Reader | Opt-in | 0 KB | CSS SVG `feTurbulence`; WCAG contrast met |
| **Day/night ambient grading** | Landing | On | 0 KB | Local system clock; static when reduced |
| **Rain-on-glass shader** | Landing | Opt-in | ~2 KB | 30 fps cap; pause control; low-power mode |
| **CSS 3D Bookshelf** | Library | Opt-in view | ~0 KB | Spines are focusable HTML DOM links |
| **WebGL Bookshelf (pull-out)** | Library | Opt-in showcase| +115 KB (R3F)| Paired with accessible DOM list overlay |
| **Stats constellation world** | Stats | Opt-in | R3F island | Instanced meshes; static chart fallback |
| **Post-session medal reveal** | Recap / Stats | Opt-in | GSAP/R3F | Skippable modal; non-blocking reading |
| **Page-curl chapter transition**| Reader break | Opt-in (off) | One quad | Snap under reduced motion; DOM text safe |
| **Opt-in Pink Noise Bed** | Reader audio | Opt-in (off) | ~1 KB | Web Audio `AudioWorklet`; user gesture only|

---

## 5. Technical Guidelines for Implementation

1. **Maintain Pure DOM Reading**: Never render body text into WebGL textures or Canvas 2D contexts.
2. **GPU Idle Discipline**: Any WebGL canvas must use `frameloop="demand"`, re-rendering only when
   state changes. Continuous 60 fps loops on battery-powered mobile devices are banned.
3. **Respect Reduced Motion**: Every animation must check:
   `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and provide an instant or static end state.
4. **Local Audio Constraints**: Audio must never start without explicit user interaction. Read-aloud
   voice synthesis must check `SpeechSynthesisVoice.localService === true` to ensure voice data is not
   streamed to cloud speech servers.

## 6. Related Notes

- [[00-Dashboard]] - main index and baseline status
- [[Reader Engine MOC]] - focus rail, typography, and reader overlays
- [[Three Ps Strategy - Place People Product]] - strategic positioning and audience alignment
- [[Graphics Quality Tiers]] - device detection, canvas scaling, and quality tiers
- [[Themes and Atmospheres]] - theme token architecture and visual styling
- [[Invariants]] - non-negotiable rules on privacy and DOM text rendering
