# Bookflow Frontend Skills & Design System Reference

Comprehensive technical guide, cognitive ergonomics research principles, design tokens, and frontend feature specifications for Bookflow.

---

## 1. Cognitive Ergonomics & Digital Reading Architecture

### 1.1 Focal Reading Rail & Saccadic Regression Reduction
- **Empirical Foundation**: Eye-tracking and psychophysiological research (*Ekin et al., PLoS ONE 2025; Haller et al., Cognitive Science 2026*) demonstrates that digital readers experience cognitive fatigue and elevated regression rates (backward eye jumps) when reading unguided long-form text.
- **Sentence/Paragraph Rail Focus**: Bookflow positions an active focal rail at `FOCUS_RAIL_RATIO = 0.382` (golden ratio). As the reader scrolls or steps, exactly one paragraph receives clear, high-contrast prominence while surrounding text gently softens.
- **Distraction Isolation**: Non-focal paragraphs remain legible for contextual awareness without visually competing with the active sentence.

### 1.2 Working-Memory Buffering & Self-Paced Pacing
- **Cognitive Integration**: Sentence-level pacing mirrors the natural syntactic integration buffer of human working memory.
- **Scroll Intent Accumulator**: Dampens trackpad velocity and mousewheel jitter (`SCROLL_INTENT_THRESHOLD`), ensuring paragraph progression occurs with deliberate rhythm rather than erratic jumps.
- **Reading Velocity Adaptation**: Configurable pace settings (`180-420ms`) allow readers to tailor the stepping transition to their personal comprehension rate.

### 1.3 Variable Reward Chapter Completion Mechanics
To compete directly with short-form video feeds without gamifying books into cheap mobile games:
1. **The Serendipitous Marginalia Capsule**: Upon finishing a chapter, generates an unannounced, beautifully typeset 1-sentence synthesis or contrasting philosophical paradox connecting the chapter to an unexpected external domain.
2. **Chapter Velocity & Flow Sparkline**: An organic visual footprint illustrating the reader's cognitive flow, pacing stability, and moments of deep absorption compared to their baseline.
3. **Next Chapter Horizon Teaser**: A 2-line contextual curiosity bridge previewing the core tension or unanswered dilemma in the upcoming chapter's opening lines.

### 1.4 In-Margin Social Layer (Asynchronous Shared Experience)
1. **Margin Resonance Heatmap & Thought Whispers**: Minimalist margin resonance indicators that reveal curated, high-signal reflections and alternative perspectives from other readers on that exact sentence.
2. **Time-Shifted Reaction Drift**: Timestamped reaction capsules left by fellow readers at emotional/intellectual climaxes that unlock only when reaching that exact paragraph.

---

## 2. Visual Identity & Apple-Inspired Design System

### 2.1 Color Palette & Semantic Tokens

| Role | Light (Paper) | Dark (Dusk / Near-Black) | Description |
| --- | --- | --- | --- |
| **Surface Base** | `#FFFEFA` | `#000000` | Calm, warm, glare-free background canvas |
| **Reading Card** | `#FFFFFF` | `#070708` | High-legibility reading surface |
| **Text Primary** | `#1C1C1E` | `#F5F5F7` | WCAG AAA contrast text |
| **Text Muted** | `#636366` | `#8E8E93` | Ambient context text |
| **Bookflow Blue** | `#507B9C` | `#6B9AC4` | Primary brand accent and focus outline |
| **Interactive Accent**| `#4169E1` | `#5B86E5` | Active buttons, progress indicators |
| **Ink Wine** | `#7B1020` | `#9B2236` | Pinned state and secondary focus markers |
| **Border / Divider** | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.12)`| Layered glass borders and subtle dividers |

### 2.2 Typography & Optimal Measure
- **Interface Font**: System UI stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif`) for crisp, native-feeling controls.
- **Reading Font**: Proven serif typographic stack (`"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`) for prolonged reading comfort.
- **Optimal Line Length**: Default column width constrained between `60ch` and `75ch` to maintain the proven optical sweet spot for minimizing line-tracking errors.
- **Dynamic Type Scale**: Adjustable font sizes (`14px` to `28px`) with proportional line-height scaling (`1.5` to `2.0`).

### 2.3 Responsive Layouts & Touch Targets
- **Mobile Touch Invariants**: All interactive buttons, icon toggles, and controls render with minimum `44 x 44` CSS pixels hit targets.
- **Mobile Bottom Sheets**: Settings, table of contents, and notes transform into smooth bottom-sheet modals on viewports `< 768px` (tested at `390 x 844px` mobile viewport).
- **Desktop Side Materials**: Translucent floating panels with `backdrop-filter: blur(20px)` and soft layered shadows.

---

## 3. High-Performance Frontend Engineering Standards

### 3.1 Code-Splitting & Lazy Chunking
- **Component Code Splitting**: Heavy conditional components (`BookOpeningIntro`, `OcrUploader`) use `React.lazy()` with `<Suspense fallback={null}>` to keep the initial landing bundle < 220 kB gzipped.
- **Dynamic Parser Loading**: Document parsing libraries (`pdfjs-dist`, `jszip`, `tesseract.js`) are dynamically imported only when a user uploads a corresponding file.

### 3.2 In-Memory Virtualization & DOM Efficiency
- **Lazy OCR Page Rendering**: The `OcrUploader` viewer renders only the currently active page in the DOM with windowed thumbnail navigation, easily handling 600+ page books without DOM bloat.
- **Monotonic Progress Indicators**: Document import and OCR loaders guarantee strictly increasing progress percentages that visibly reach `100%` before transitioning to the reader.

### 3.3 Keyboard & Accessibility Standards
- **Keyboard Shortcuts**:
  - `Down` / `J` / `Space`: Advance to next paragraph.
  - `Up` / `K` / `Shift+Space`: Return to previous paragraph.
  - `PageDown` / `PageUp`: Skip 3 paragraphs rapidly.
  - `Escape`: Pin / unpin current paragraph.
- **Accessibility Attributes**: Full `aria-label`, `aria-modal`, `role="dialog"`, and `prefers-reduced-motion` compliance.

---

## 4. Verification Checklist

Before releasing or staging frontend changes:
- `npm run lint` passes with 0 warnings/errors.
- `npm run test` executes vitest across all 10 test suites (35 tests).
- `npm run build` succeeds with isolated lazy-loaded chunks.
- Mobile viewport `390 x 844` displays zero horizontal overflow.
- Instant skip functions smoothly on the opening video intro.
