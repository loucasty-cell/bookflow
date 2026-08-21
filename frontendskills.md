# Bookflow Frontend Skills & Technical Architecture Reference

Comprehensive technical guide, React/Vite workflow standards, cognitive ergonomics research, state models, and design system specifications for Bookflow.

---

## 1. Technology Stack & Framework Workflows

### 1.1 Core Runtime & Bundling Pipeline
- **React 19**: Component lifecycle, concurrent rendering, and strict memory safety.
- **Vite 8 & Rolldown/Rollup**: Fast HMR in development and tree-shaken static production bundle output in `dist/`.
- **Manual Chunk Splitting (`vite.config.js`)**:
  - `vendor-react`: `react`, `react-dom`
  - `vendor-motion`: `framer-motion` (spring physics and layout animations)
  - `vendor-icons`: `lucide-react` (feather-light interface icons)
  - `vendor-state`: `zustand`, `swr` (reactive state and cache layers)
  - `pdf`: `pdfjs-dist` (local worker loading and client-side extraction)
  - `jszip`: `jszip` (local EPUB package reading)
- **Local OCR Asset Middleware (`localOcrAssets`)**: Custom Vite plugin serving Tesseract.js WASM binaries (`tesseract-core-lstm.wasm`, `tesseract-core-simd-lstm.wasm`) and English trained data directly from local node modules without external network dependencies.

### 1.2 Global State & Persistence Layer
- **Zustand (`useReaderStore`, `useUiStore`)**: Lightweight global store with selector subscriptions to prevent unnecessary component re-renders.
- **Resilient Storage Fallback (`src/shared/lib/storage.js`)**:
  - Wraps `localStorage` with `getSafeStorage()` and `memoryStorage` fallback.
  - Automatically recovers in private/incognito browsing or when third-party cookies/storage are blocked by browser privacy policies.
- **SWR Data Caching**: Lightweight, reactive client-side cache for document metadata, reading positions, and async job polling.

---

## 2. Local-First Document Ingestion Pipeline

### 2.1 Supported Document Formats & Security Boundaries
- **PDF Documents (`.pdf`)**:
  - In-memory parsing via `pdfjs-dist` worker.
  - Sub-millisecond selectable text extraction.
  - Automatic fallback to on-device Tesseract.js OCR for image-only pages.
- **EPUB Packages (`.epub`)**:
  - Asynchronous zip archive extraction using `jszip`.
  - Parses `META-INF/container.xml` to discover the `.opf` package manifest, spine order, metadata, and `.ncx` / navigation HTML chapters.
- **Markdown (`.md`, `.markdown`)**:
  - Converts `# Heading 1` into chapters and `## Heading 2` / `### Heading 3` into reading sections.
  - Strips front-matter headers safely.
- **Plain Text (`.txt`)**:
  - Paragraph-level splitting with chapter demarcation heuristics based on double line breaks and numerical markers.

### 2.2 Security & Privacy Guarantees
- **Zero Cloud Persistence**: Imported files are processed entirely in browser memory. Full book contents are never persisted or uploaded to remote cloud servers by default.
- **Safe HTML Rendering**: All book prose is rendered via standard React text nodes and element trees. `dangerouslySetInnerHTML` is strictly prohibited for book contents.

---

## 3. Cognitive Ergonomics & Digital Reading Architecture

### 3.1 Focal Reading Rail & Saccadic Regression Reduction
- **Empirical Foundation**: Keith Rayner's E-Z Reader model and psychophysiological research (*PLoS ONE 2025; Cognitive Science 2026*) show that digital readers suffer cognitive fatigue and frequent regressive eye movements when reading unguided text.
- **Golden Ratio Focal Line**: Positions the active focal rail at `FOCUS_RAIL_RATIO = 0.42` (~42% of viewport height).
- **Smooth Highlighting**: Active sentence/paragraph receives high-contrast prominence while surrounding text softly softens without losing legibility.

### 3.2 Bionic Reading & Saccadic Fixation Engine
- **Perceptual Span Mechanics**: Human visual span captures 3–4 characters left and 14–15 characters right of a fixation. Bionic reading calculates dynamic grapheme anchors (`getFixationLength`):
  - 1 char $\rightarrow$ 1 anchor
  - 2–3 chars $\rightarrow$ 1 anchor
  - 4–6 chars $\rightarrow$ 2 anchors
  - 7–9 chars $\rightarrow$ 3 anchors
  - 10+ chars $\rightarrow$ 4+ anchors
- **React Tokenizer (`textFormatter.js`)**: Safely maps words into `<span className="bionic-token"><b className="fixation-anchor">anchor</b>rest</span>` elements with zero HTML injection risks.

### 3.3 Neurodivergent & Accessible Typography System
- **Typefaces (`data-font`)**:
  - **Serif**: `Georgia, Cambria, "Times New Roman", Times, serif` (literary immersion).
  - **Sans**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif` (clean modern UI).
  - **Clean (Atkinson Hyperlegible)**: High character differentiation (distinguishes `1`, `I`, `l`, `0`, `O`).
  - **Dyslexic (OpenDyslexic)**: Weighted baseline letterforms that combat rotational ambiguity.
- **Letter Tracking (`data-letter-spacing`)**:
  - **Default**: `0.002em`
  - **Wide**: `0.035em` (relieves visual crowding)
  - **Spacious**: `0.07em` (accommodates high-speed scanning and dyslexia)

### 3.4 Momentum-Aware Scroll Controller (`useScrollPosition`)
- **Scroll Intent Accumulator**: Dampens mouse wheel jitter and trackpad momentum (`SCROLL_INTENT_THRESHOLD = 96`, `MAX_SCROLL_INPUT = 64`).
- **Velocity & Direction Tracking**: Real-time tracking of reading velocity (words/min), scroll direction, and active section boundaries.
- **Reduced Motion Support**: Fully respects `prefers-reduced-motion: reduce`, instantly snapping focus without animating transitions.

### 3.5 Floating Selection Toolbar (`SelectionTooltip`)
- Renders directly above selected text with spatial boundary checks.
- One-tap actions: create margin note, copy with tactile feedback, or bookmark paragraph.

### 3.6 Editorial Typography System
- **Drop Caps**: Chapter-opening styled first letters.
- **Keyword Highlights (`.kw`)**: Subtle conceptual emphasis.
- **Pull Quotes (`.pullq`)**: Elegant indented quotes with brand royal borders.
- **Insight Callout Boxes (`.insight-box`)**: Structured amber containers for core takeaways.

### 3.7 Cognitive Flow & Habit Anchoring
- **4-Minute Drop-Off Intervention (`InterventionModal`)**: Re-anchors attention drift (velocity decay or stagnation) with non-intrusive curiosity hooks.
- **Variable Reward Marginalia Capsule (`VariableRewardCapsule`)**: Unannounced chapter completion summaries and pacing sparklines.
- **Haptic Feedback (`haptics.js`)**: Subtle vibration pulses on mobile devices for key interactions.

---

## 4. Visual Identity & Apple-Inspired Design System

### 4.1 Atmosphere Color Tokens

| Role | Paper (Light) | Dusk (Near-Black) | Tint (Remix) | Description |
| --- | --- | --- | --- | --- |
| **Surface Canvas** | `#FFFEFA` | `#0B0F19` | `#F4EFEA` | Warm, non-glare reading canvas |
| **Reading Card** | `#FFFFFF` | `#121826` | `#FAF7F2` | High-legibility card surface |
| **Text Ink** | `#1B2633` | `#F2F2F7` | `#2D251E` | WCAG AAA contrast prose |
| **Text Muted** | `#647384` | `#94A3B8` | `#7A6E65` | Contextual ambient text |
| **Brand Blue** | `#2B5A84` | `#6B9AC4` | `#3A6B94` | Primary brand accent and focus ring |
| **Brand Royal** | `#4169E1` | `#5B86E5` | `#4A72E8` | Interactive buttons and progress bar |
| **Wine Accent** | `#7B1020` | `#9B2236` | `#8A1828` | Pinned state and bookmark markers |

### 4.2 Mobile Touch & Layout Invariants
- Minimum touch target area: `44 x 44` CSS pixels.
- Zero horizontal overflow across all mobile viewports (`320px` to `430px`).
- Safe-area insets honored (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`).

---

## 5. Quality Assurance & Verification Standards

Run the verification pipeline before pushing changes:

```bash
# 1. Static code analysis and linting
npm run lint

# 2. Automated unit and component test suites (12 suites, 44 tests)
npm test

# 3. Production Vite build verification
npm run build
```
