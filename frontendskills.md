# Bookflow Frontend Skills & Cognitive Design System Reference

Comprehensive technical guide, cognitive ergonomics research principles, design tokens, and frontend feature specifications for Bookflow.

---

## 1. Cognitive Ergonomics & Digital Reading Architecture

### 1.1 Focal Reading Rail & Saccadic Regression Reduction
- **Empirical Foundation**: Eye-tracking and psychophysiological research (*Keith Rayner's E-Z Reader Model; Ekin et al., PLoS ONE 2025; Haller et al., Cognitive Science 2026*) demonstrates that digital readers experience cognitive fatigue, elevated return-sweep errors, and frequent disorienting regressions when reading unguided long-form text.
- **Sentence/Paragraph Rail Focus**: Bookflow positions an active focal rail at `FOCUS_RAIL_RATIO = 0.42` (the golden reading horizon). As the reader scrolls or steps, exactly one paragraph receives clear, high-contrast prominence while surrounding text gently softens.
- **Distraction Isolation**: Non-focal paragraphs remain legible for contextual awareness without visually competing with the active sentence.

### 1.2 Bionic Reading & Saccadic Fixation Engine
- **Perceptual Span Targeting**: The human perceptual span extends 3–4 characters left and 14–15 characters right. Bionic reading bolds the leading graphemes of each word (`getFixationLength`), allowing the oculomotor system to anchor rapid saccades without fixating on entire words.
- **Pure React Tokenizer**: `formatParagraphText` tokenizes words and applies `<b className="fixation-anchor">` via React element trees without `dangerouslySetInnerHTML`, preserving strict security and accessibility.
- **Toggleable Acceleration**: Readers can switch between Standard prose and Bionic fixations instantly via the reading space settings popover.

### 1.3 Neurodivergent & Accessible Typography System
- **Typeface Selection**:
  - **Serif**: Classic literary serif (`Georgia, Cambria, "Times New Roman", serif`) for prolonged reading comfort.
  - **Sans**: Crisp modern system stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`).
  - **Clean (Hyperlegible)**: High-distinction letterforms (`Atkinson Hyperlegible`) designed to eliminate character ambiguity (e.g., distinguishing `1`, `I`, `l`).
  - **Dyslexic**: Heavily weighted baselines (`OpenDyslexic`) to prevent letter inversion and visual crowding.
- **Letter Tracking (Character Spacing)**:
  - `Default (0.002em)`: Balanced optical rhythm.
  - `Wide (0.035em)`: Reduced inter-character crowding for visual processing ease.
  - `Spacious (0.07em)`: Maximum separation for dyslexia accommodation and high-velocity scanning.
- **Dynamic Optical Pacing**: Adjustable font size (`17px–24px`), line height (`1.5–2.2`), page width (`720px–1120px`), and stepping cooldown (`180ms–420ms`).

### 1.4 Momentum-Aware Scroll Controller
- **Scroll Position Tracking (`useScrollPosition`)**: High-frequency RAF-backed hook that monitors scroll velocity, direction (`up` / `down` / `idle`), progress percentage, and active focal element.
- **Scroll Intent Dampening**: Dampens trackpad inertia and wheel jitter (`MAX_SCROLL_INPUT = 64`, `SCROLL_INTENT_THRESHOLD = 96`), ensuring paragraph progression occurs with deliberate rhythm.
- **Reduced Motion Compliance**: Automatically disables smooth-scrolling animations and translates transitions into instant jumps when `prefers-reduced-motion: reduce` is detected.

### 1.5 Floating Selection Context Toolbar (`SelectionTooltip`)
- **Spatial Positioning**: Renders directly above the user's selected text selection using DOM range coordinates with boundary containment checks.
- **Quick Margin Notes**: Extracts selected text directly into the notes drawer with an active drafting cursor.
- **Clipboard & Bookmarks**: One-tap copy with haptic confirmation and paragraph-level bookmarking.

### 1.6 Editorial Typography & Semantic Styles
- **Drop Caps**: Elegant first-letter drop caps on chapter opening paragraphs with brand blue accenting.
- **Keyword Highlights (`.kw`)**: Subtle background tinting for critical conceptual terms.
- **Pull Quotes (`.pullq`)**: Indented, italicized quotes with brand royal left borders for memorable passages.
- **Insight Callout Boxes (`.insight-box`)**: Warm amber warning and insight containers with structured uppercase badges.

### 1.7 Cognitive Flow & Habit Anchoring
- **4-Minute Drop-Off Intervention (`InterventionModal`)**: Re-anchoring dialogs that trigger during attention drift (inactivity or velocity decay around minute 4), presenting curiosity hooks to recover flow.
- **Variable Reward Capsules (`VariableRewardCapsule`)**: Unannounced, serendipitous synthesis cards and flow sparklines at chapter milestones.
- **Tactile Haptic Feedback (`haptics.js`)**: Subtle mobile vibration feedback for bookmarking, notes, and navigation milestones.

---

## 2. Visual Identity & Apple-Inspired Design System

### 2.1 Atmosphere Themes & Color Palette

| Role | Paper (Light) | Dusk (Near-Black) | Tint (Remix) | Description |
| --- | --- | --- | --- | --- |
| **Surface Canvas** | `#FFFEFA` | `#0B0F19` | `#F4EFEA` | Warm, glare-free, non-smearing background |
| **Reading Card** | `#FFFFFF` | `#121826` | `#FAF7F2` | High-legibility reading surface |
| **Text Ink** | `#1B2633` | `#F2F2F7` | `#2D251E` | WCAG AAA contrast text |
| **Text Muted** | `#647384` | `#94A3B8` | `#7A6E65` | Contextual ambient text |
| **Brand Blue** | `#2B5A84` | `#6B9AC4` | `#3A6B94` | Primary brand accent and focus outline |
| **Brand Royal** | `#4169E1` | `#5B86E5` | `#4A72E8` | Active buttons, progress indicators |
| **Wine Accent** | `#7B1020` | `#9B2236` | `#8A1828` | Pinned state and bookmark markers |
| **Border / Glass** | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.10)`| `rgba(0,0,0,0.06)` | Layered glass borders and subtle dividers |

### 2.2 Layout Invariants & Touch Targets
- **Minimum Hit Targets**: All interactive buttons render with minimum `44 x 44` CSS pixels touch areas.
- **Mobile Responsive Drawer**: Settings, contents, and notes transform into smooth right drawers / bottom sheets on viewports `< 768px`.
- **Zero Horizontal Overflow**: Fluid typography and max-width containers prevent horizontal scrolling at all mobile widths (320px–430px).

---

## 3. High-Performance Engineering Standards

### 3.1 Code-Splitting & Lazy Loading
- Heavy components (`OcrUploader`, `BookOpeningIntro`) and format parsers (`pdfjs-dist`, `jszip`, `tesseract.js`) are dynamically imported via `React.lazy()` and dynamic `import()`.
- Production bundle is organized into distinct vendor chunks (`vendor-react`, `vendor-motion`, `vendor-icons`, `vendor-state`, `pdf`, `jszip`).

### 3.2 Resilient Error Boundaries
- Critical panels and subtrees (Focus Card, Settings, Notes, and root App) are wrapped in `ErrorBoundary` components with graceful fallbacks and reset handlers.

### 3.3 Keyboard Navigation Matrix
- `Down` / `J` / `Space`: Advance to next paragraph.
- `Up` / `K` / `Shift+Space`: Return to previous paragraph.
- `PageDown` / `PageUp`: Advance / rewind 3 paragraphs.
- `Escape`: Pin / unpin current paragraph or close panels.

---

## 4. Frontend Verification Checklist

Before releasing or staging frontend changes:
- `npm run lint` passes with 0 warnings/errors.
- `npm test` executes vitest across all 12 test suites (44 tests).
- `npm run build` generates production bundle in `dist/` without errors.
- Mobile viewport `390 x 844` displays zero horizontal overflow.
- Bionic fixations, typefaces, and letter spacing toggle cleanly without flicker.
