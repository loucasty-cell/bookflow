# Bookflow React/Vite UI/UX Feature & Architecture Specification

This document provides a comprehensive recovery reference of all user interface (UI), user experience (UX), view angles, interaction modes, typography tokens, reader ergonomics, and settings implemented across the React/Vite versions and prototype commits in Bookflow's Git history.

---

## 1. Executive Summary & Design Principles

Bookflow was designed as a private, distraction-free, browser-based reading environment with a primary interaction centered on **sentence and paragraph focus**. 

### Core Product Tenets
1. **Calm by Default**: Reading chrome stays subdued until summoned. The typography and content lead the experience.
2. **Local-First & Zero Cloud Storage**: All document parsing (PDF, EPUB, TXT, MD) and OCR happen on-device in browser memory; only reading state (bookmarks, notes, progress, settings) persists in `localStorage`.
3. **Scroll-Driven Focus Rail**: Instead of requiring manual text selection, scrolling gracefully pulls the active paragraph or sentence into focus near the golden-ratio focal line (`0.42` / `0.382`).
4. **Adaptive Ergonomics**: Precise control over text size, line height, column measure, focus depth, atmosphere themes, and scroll pacing.

---

## 2. Views & Angles of View (Screen Architectures)

Bookflow comprises distinct visual screens and overlay panels:

```text
+-----------------------------------------------------------------------------------+
| Topbar (Brand, Document Title, Progress Bar %, Notes Count, Settings, Close)      |
+---------------------+---------------------------------------+---------------------+
| Contents Navigator  | Reader Canvas                         | Settings / Notes    |
| (Collapsible)       | - Document Header & Metadata Stats    | Drawers (Slide-in)  |
| - Miniature Card    | - Golden Ratio Focus Rail (42%)       |                     |
| - Book Stats        | - Active Paragraph Highlight (Blue)   | - Font / Measure    |
| - Chapter List      | - Static Region Floater (Preface/TOC) | - Theme Selector    |
| - Quick Jump TOC    | - End Mark & Next Book Trigger        | - Margin Notes List |
+---------------------+---------------------------------------+---------------------+
|                     | Floating Focus Card (Held/Live State) |                     |
+---------------------+---------------------------------------+---------------------+
```

---

### View Angle 1: Landing Page & Library Intake (`LandingPage.jsx`)

The landing screen serves as the intake gateway for local documents and built-in samples.

* **Branded Navigation Bar**:
  * Brand insignia with quill artwork (`bookflow-quill.png`).
  * "Local by design" trust badge with shield icon (`ShieldCheck`).
  * Light / Dusk appearance toggle (`Sun` / `Moon`).
* **Hero Headline & Copy**:
  * Large gradient headline: *"Read deeper. Keep going."* (and *"Read smarter, not harder"*).
  * Supporting narrative: *"Bookflow keeps your place, quiets the chrome, and brings one complete paragraph forward at a time."*
* **Interactive Drag-and-Drop Intake Card (`.drop-card`)**:
  * Accepts `.pdf`, `.epub`, `.txt`, `.md` up to 50 MB.
  * Drag-over visual feedback (`is-dragging` glowing border and surface fill).
  * Format badge row: `PDF`, `EPUB`, `TXT`, `MD`.
  * Upload icon with micro-animations.
  * Privacy indicator: *"Private check. No upload."*
* **Sample Book Quick Start**:
  * Button to launch the built-in sample *"The Art of Staying Curious"*.
* **Hero Visual & Callout Badges**:
  * Hero image card with sculpted quill artwork and glassmorphic caption.
  * Floating badge 1: *"Keep your place - Scroll sets the rhythm"* (`visual-card-focus`).
  * Floating badge 2: *"Local by default - Your book stays yours"* (`visual-card-private`).
* **Feature Strip (Three-Column Pillars)**:
  * `01 Calm by default`: Content leads, controls stay quiet.
  * `02 Find your pace`: Adjustable type, line height, column width, focus depth, and theme.
  * `03 Private by default`: Bookmarks, notes, and progress stay strictly local.
* **Cinematic Video Intro (`BookOpeningIntro.jsx`)**:
  * First-visit 9.15-second opening book animation (`bookflow-opening-intro.mp4`).
  * Click-anywhere or press any key to skip immediately.
  * Smooth 520ms opacity exit transition with `prefers-reduced-motion` bypass.

---

### View Angle 2: Document Processing Overlay (`LoadingOverlay.jsx`)

Displayed while heavy PDF/EPUB parsing, text extraction, or local OCR executes.

* **Glassmorphic Modal Card**: Deep blurred backdrop with ambient shadow.
* **Artwork Header**: Branded illustration banner.
* **Live Progress Bar**: Dynamic percentage bar with smooth spring transitions (`linear-gradient(90deg, #4169e1, #507b9c, #7b1020)`).
* **Multi-Step Status Indicators (5-Step Pipeline)**:
  1. Reading file
  2. Extracting text / rendering PDF canvas
  3. Cleaning & structuring paragraphs
  4. Chapter & subheading demarcation
  5. Rendering reader canvas

---

### View Angle 3: Main Reading Canvas (`ReaderPage.jsx`)

The primary reading environment optimized for immersion.

* **Sticky Glassmorphic Topbar (`.reader-topbar`)**:
  * Brand button to return to home/library.
  * Document identity container: Title and format indicator with ellipsis truncation.
  * Real-time Progress Widget: Progress bar + tabular numerical percentage (`0% - 100%`).
  * Continue Chapter Tracker: Active chapter index (`Section X / Y`).
  * Margin Notes Action Button: Displays note counter badge (`notes.length`).
  * Reading Settings Gear Button: Toggles settings popover.
  * Close Book Action Button: Returns to landing view.
* **Document Header**:
  * Format pill: `PDF | X sections`, `EPUB | X chapters`, `MD`, or `TXT`.
  * Fluid headline: Display typography scaled with `clamp(3.5rem, 6.5vw, 6.6rem)`.
  * Subtitle / Author credit in italic serif.
  * Metadata bar: Word count, estimated read time (`X min read`), and "Saved locally" badge.
  * Continue Reading Card: Shows current chapter and reading completion percentage.
* **Reading Column & Typography Measure**:
  * Centered reading rail bounded by `--reader-width` (`720px - 1120px` / `60-75ch`).
  * Drop Cap (`::first-letter`): Floated `3.3em` initial letter on the first paragraph of every section.
  * Section demarcations: Number badge (`Page 01` or `Section 01`), `h2` chapter title, `h3` subsection headers.
* **Paragraph Focus Highlight**:
  * Pale-blue surface background (`rgba(194, 220, 255, 0.62)`).
  * Left edge indicator (`3px` solid accent bar in royal blue / wine / crimson).
  * Subtle spatial translation (`translateX(2px)`).
  * Weighted typography on active sentence/paragraph.
  * Non-active paragraph attenuation according to focus depth (`soft`: 58% opacity, `deep`: 25% opacity).
  * Bookmark indicator: Small red accent dot at the paragraph trailing edge.
* **Static Region Handling (Front-Matter & End-Matter)**:
  * Automatically detects preface, table of contents, copyright, appendix, bibliography, index.
  * Suspends stepped focus snapping so readers can scroll freely.
  * Displays floating pill badge (`.static-region-label`) indicating static section mode.
* **End Mark & Transition Footer**:
  * *"You reached the end - Take the thought that stayed with you."*
  * "Open another book" primary action button.

---

### View Angle 4: Floating Focus Card (`FocusCard.jsx`)

A floating bottom control card synchronized with the active focus target.

* **Live Status Pill**:
  * *"Held in focus - Paused"* (when pinned by user click or keypress).
  * *"In focus - Live"* (when following active scroll position).
* **Excerpt Preview**: Clamped two-line preview of the focused paragraph text.
* **Action Toolbar**:
  * **Step Controls**: Previous (`ChevronLeft`) and Next (`ChevronRight`) paragraph stepping buttons.
  * **Save / Bookmark**: Toggles bookmark state with `Bookmark` / `BookmarkCheck` icons.
  * **Copy**: One-click copy of the active paragraph to the system clipboard.
  * **Resume Flow**: Unpins paragraph and restores continuous scroll tracking.

---

### View Angle 5: Contents & Chapter Navigator (`ContentsPanel.jsx`)

A collapsible navigation rail available on both desktop and mobile.

* **Desktop Collapsible Sidebar**:
  * Expand/collapse toggle (`PanelLeftClose`) that shifts the reader canvas seamlessly.
* **Mobile Slide-Over Drawer**:
  * Dark backdrop blur scrim (`.mobile-scrim`) with touch swipe-away.
* **Book Miniature Header**:
  * Book cover artwork thumbnail, full title with tooltip, author, and format badge.
* **Document Metrics Grid**:
  * Total Sections count.
  * Total Saved Bookmarks count.
  * Total Estimated Reading Time (based on 220-230 WPM).
* **Chapter Progress Item List**:
  * Numbered chapter badges (`1`, `2`, `3`...).
  * Chapter titles with multi-line clamping.
  * Paragraph count indicator for each chapter.
  * Active chapter highlight with left border accent.
  * Click-to-jump with smooth viewport auto-scroll.
* **Footer Action**: "Open another book" intake shortcut.

---

### View Angle 6: Margin Notes Drawer (`NotesPanel.jsx`)

A slide-in drawer anchored to the right side of the screen.

* **Panel Header**: Title, icon (`MessageSquareText`), and close button (`X`).
* **Active Quote Preview**: Automatically displays the currently focused paragraph in an indented blockquote.
* **Note Composer**:
  * Expanding multiline textarea with placeholder: *"What do you want to remember?"*
  * "Add note" primary button with disabled state when empty.
* **Saved Notes Feed**:
  * Chronological cards displaying linked quote excerpts, personal annotations, and deletion buttons (`X`).
* **Empty State**: Quiet margins illustration and prompt: *"Focus a paragraph, then capture the thought it sparked."*

---

### View Angle 7: Reading Settings Popover (`SettingsPanel.jsx`)

Ergonomic calibration panel for adjusting reading parameters.

* **Reading Mode**:
  * `Focus`: Stepped paragraph/sentence progression.
  * `Normal`: Native continuous scrolling.
* **Atmosphere (Color Themes)**:
  * `Light / Paper`: Soft off-white `#FFFEFA` / `#FAF9F7`.
  * `Black / Dusk`: Deep near-black `#000000` / `#070708` / `#111113`.
  * `Tint / Remix`: Warm editorial cream and wine accent `#F3EAD9` / `#7B1020`.
* **Precision Sliders (with live numerical readouts)**:
  * **Text size**: `14px` to `28px` (default `20px`).
  * **Line spacing / leading**: `1.5` to `2.2` (default `1.9`).
  * **Page width / column measure**: `720px` to `1120px` (default `720px` / `60-75ch`).
  * **Paragraph pace / scroll cooldown**: `180ms` to `420ms` (default `240ms`).
* **Focus Depth**:
  * `off`: Uniform readability across all paragraphs.
  * `soft`: Subtle emphasis on the active target; surrounding text at 58% opacity.
  * `deep`: High-contrast spotlight; surrounding text dimmed to 25% opacity.

---

### View Angle 8: Floating Text Selection Tooltip (`.sel-tip` from HTML prototype)

Contextual floating toolbar appearing above selected text ranges.

* **Floating Tooltip**: Appears directly above selected text with fixed coordinates.
* **Quick Actions**:
  * `Note`: Immediately opens the notes drawer with the selected snippet pre-filled.
  * `Copy`: Copies selection to clipboard and dismisses tooltip.
* **Editorial Highlights**:
  * Keyword highlights (`.kw`).
  * Pull quotes (`.pullq`) in serif italics with stylized quote marks.
  * Insight callout boxes (`.insight-box` with amber accents and `◆ INSIGHT` badges.

---

### View Angle 9: Behavioral AI & Habit Engagement Extensions

Specialized cognitive retention components:

* **4-Minute Drop-Off Intervention Modal (`InterventionModal.jsx`)**:
  * Telemetry-driven ambient re-engagement modal triggered when reader focus drifts.
  * Curiosity gap hook: *"You're just 3 pages away from the moment where everything in this chapter flips on its head."*
  * Loss aversion cue: *"If you leave now, your flow state might take 23 minutes to rebuild when you return."*
  * Action buttons: "Keep Reading (Reveal the twist)" vs "I'll stop here for now".
* **Variable Reward Marginalia Capsule (`VariableRewardCapsule.jsx`)**:
  * Unannounced reward capsule unlocked upon chapter completion.
  * Serendipitous cross-domain synthesis quote.
  * Animated SVG cognitive flow velocity sparkline.
  * Horizon teaser previewing the upcoming chapter's core tension.
* **High-Throughput Visual OCR Scanner Modal (`OcrUploader.jsx`)**:
  * Drag-and-drop modal for scanned PDF ingestion.
  * Real-time Server-Sent Events (SSE) stream monitor (pages completed, pages/sec velocity, word count).
  * Dual-mode engine routing (Local Tesseract vs accelerated server endpoints).
  * Integrated multi-page preview canvas with interactive search and chapter tree reconstruction.

---

## 3. Interaction Mechanics & Control Architecture

### 3.1 Keyboard Shortcuts Matrix

| Key Combination | Action | Context |
| --- | --- | --- |
| `ArrowDown` / `j` | Focus next paragraph / sentence | Focus Mode |
| `ArrowUp` / `k` | Focus previous paragraph / sentence | Focus Mode |
| `Space` / `Enter` | Pin / hold active paragraph in focus | Focus Mode |
| `Escape` | Unpin active paragraph / resume flow / close modals | Global |
| `Click` on paragraph | Focus and pin that specific paragraph | Reading Canvas |

### 3.2 Scroll Intent & Damping Algorithm (`readingController.js`)

To prevent jerky or erratic focus jumps during mouse wheel or trackpad movement:

```javascript
export const FOCUS_RAIL_RATIO = 0.42; // Golden ratio focus rail line
export const MAX_SCROLL_INPUT = 64;   // Input cap per wheel event
export const SCROLL_INTENT_THRESHOLD = 96; // Accumulated delta required to step
export const LINE_COOLDOWN = 240;     // Calming delay (ms) between paragraph shifts

export function accumulateScrollIntent(current, delta, maxInput = MAX_SCROLL_INPUT) {
  const safeDelta = Math.max(-maxInput, Math.min(maxInput, Number(delta) || 0));
  if (!safeDelta) return current;
  if (current && Math.sign(current) !== Math.sign(safeDelta)) return safeDelta;
  return current + safeDelta;
}
```

### 3.3 Safe Viewport Alignment Engine (`readerViewport.js`)

Calculates dynamic scroll margins to prevent the active paragraph from being obscured by top bars or bottom floating overlays:

* **Default Safe Padding**: `24px` top and bottom margins.
* **Bottom Overlay Awareness**: Measures `.focus-card` bounding rect dynamically and expands bottom safe padding when overlapping.
* **Focus Band Geometry**: Paragraph is kept within the optimal reading zone (`16% - 36%` of visible canvas height).

### 3.4 Focus Eligibility Classification (`focusEligibility.js`)

Distinguishes between substantive narrative content and structural document matter:

* **Front-Matter Exclusion Patterns**: `cover`, `title page`, `contents`, `table of contents`, `copyright`, `dedication`, `acknowledgements`, `preface`, `foreword`, `prologue`, `introduction`, `epigraph`, `author's note`.
* **End-Matter Exclusion Patterns**: `appendix`, `bibliography`, `references`, `glossary`, `index`, `credits`, `afterword`, `epilogue`, `about the author`.
* **Protected Chapter Patterns**: Retains focus eligibility on items matching `chapter`, `part`, `section`, `lesson`, `unit`, `act`, `volume`.

### 3.5 Reading Time Estimator (`readingTime.js`)

* Computes reading duration assuming **220–230 words per minute**.
* Adds **300ms pause** for terminal sentence punctuation (`.`, `!`, `?`).
* Adds **150ms pause** for internal clause punctuation (`,`, `;`, `:`).
* Formats human-readable output (e.g., `< 1 min`, `4 min`, `1 hr 12 min`).

---

## 4. Design Tokens & Visual Hierarchy

### 4.1 Color System

| Token Name | Hex / Value | Semantic Role |
| --- | --- | --- |
| `--brand-blue` | `#507B9C` | Primary branding, buttons, chapter headers |
| `--brand-soft` | `#C2DCFF` | Focus background highlight tint |
| `--brand-red` | `#E3242B` | Bookmark markers, interaction accents, badges |
| `--brand-navy` | `#171D3A` | Primary typography ink in light mode |
| `--brand-royal` | `#4169E1` | Active interactive elements, focus edge line |
| `--brand-wine` | `#7B1020` | Remix atmosphere secondary accent |
| `--brand-cream` | `#F3EAD9` | Remix / warm paper background tint |

### 4.2 Theme Color Profiles

* **Paper Mode (Light)**:
  * Canvas Background: `#FFFEFA` / `#FAF9F7`
  * Typography Ink: `#171D3A` / `#1B2633`
  * Chrome Surfaces: Glassmorphic `rgba(255, 255, 255, 0.78)`
  * Focus Highlight: `rgba(194, 220, 255, 0.62)` with `#4169E1` left edge
* **Dusk Mode (Near-Black Dark)**:
  * Canvas Background: `#000000` / `#08080A` / `#111113`
  * Typography Ink: `#F2F2F7` / `#F5F5F7`
  * Chrome Surfaces: Glassmorphic `rgba(16, 16, 18, 0.78)`
  * Focus Highlight: `rgba(143, 29, 44, 0.2)` with `#AA2638` left edge
* **Remix / Tint Mode (Editorial Sepia)**:
  * Canvas Background: `#F3EAD9` / `#FFFAF2`
  * Typography Ink: `#171D3A`
  * Chrome Surfaces: Glassmorphic `rgba(255, 250, 242, 0.8)`
  * Focus Highlight: `rgba(236, 208, 215, 0.62)` with `#7B1020` left edge

### 4.3 Typography Tokens

* **Interface Font Stack**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`
* **Reading Body Font Stack**: `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif`
* **Fluid Font Size**: Configurable `14px - 28px` (default `20px`)
* **Line Height (Leading)**: Configurable `1.5 - 2.2` (default `1.9`)
* **Column Measure**: Configurable `720px - 1120px` (optimal `60-75 characters per line`)

### 4.4 Spatial & Elevation Tokens

* **Spacing Scale**:
  * `--space-1`: `4px` | `--space-2`: `8px` | `--space-3`: `12px` | `--space-4`: `16px`
  * `--space-5`: `20px` | `--space-6`: `24px` | `--space-8`: `32px` | `--space-10`: `40px`
* **Corner Radii**:
  * `--radius-sm`: `10px` | `--radius-md`: `14px` | `--radius-lg`: `18px` | `--radius-xl`: `24px` | `--radius-full`: `999px`
* **Shadow Elevations**:
  * `--shadow-sm`: `0 1px 3px rgba(23, 29, 58, 0.08)`
  * `--shadow-md`: `0 10px 30px rgba(23, 29, 58, 0.10)`
  * `--shadow-lg`: `0 24px 70px rgba(23, 29, 58, 0.16)`
* **Spring Physics**:
  * `--spring`: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
  * Durations: `--duration-micro` (`120ms`), `--duration-short` (`220ms`), `--duration-medium` (`320ms`)

---

## 5. Responsive Layout Breakpoints

1. **Desktop Large (> 1040px)**:
   * Two-column landing hero (hero copy + artwork showcase).
   * Fixed collapsible sidebar navigator (`294px`).
   * Centered reader canvas (`margin-right: 336px` when settings open, `356px` when notes open).
2. **Tablet & Small Desktop (660px - 1040px)**:
   * Single-column stacked landing hero.
   * Floating focus card width constrained to `min(340px, calc(100vw - 36px))`.
   * Contents sidebar converts to off-canvas slide-in drawer with `.mobile-scrim`.
3. **Mobile Devices (< 660px)**:
   * Minimal topbar with condensed brand title and compact action icons.
   * Trust badges tucked into menu.
   * Touch swipe navigation for drawers.
   * Safe-area insets honored (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`).

---

## 6. State Persistence Contract (`localStorage`)

All persistent reader session data is stored locally under namespaced keys:

* **Settings Key**: `bookflow:settings`
  ```json
  {
    "fontSize": 20,
    "lineHeight": 1.9,
    "columnWidth": 720,
    "focusPace": 240,
    "focus": "soft",
    "theme": "paper",
    "mode": "focus"
  }
  ```
* **Document Session Key**: `bookflow:document:${documentId}` (where `documentId = ${title}-${size}-${lastModified}`)
  ```json
  {
    "progress": 42.5,
    "activeChapter": 1,
    "pinnedId": "ch1-p3",
    "bookmarks": ["ch0-p2", "ch1-p3"],
    "notes": [
      {
        "id": 1691823000000,
        "quote": "Attention turns familiar moments into open doors...",
        "text": "Key thesis for chapter 1."
      }
    ],
    "scrollTop": 1420
  }
  ```

---

## 7. Verification & Implementation Checklist

When restoring or adding code for these features, verify against:
- [ ] Landing hero, drag-and-drop dropzone, and format badges render without layout shift.
- [ ] Video opening transition plays on first visit and skips immediately on click.
- [ ] Golden-ratio focus rail accurately highlights the active paragraph at 42% viewport height.
- [ ] Pinned focus freezes the highlighted paragraph upon Space/Enter/Click.
- [ ] Focus step buttons (`<` / `>`) advance paragraph by paragraph and reset pin state.
- [ ] Collapsible sidebar shifts canvas margins smoothly on desktop and acts as a slide-over drawer on mobile.
- [ ] Margin notes composer attaches quoted paragraph excerpts to user notes.
- [ ] Settings sliders update typography in real time via CSS variables.
- [ ] Paper, Dusk, and Remix atmosphere themes apply high-contrast, accessible palettes.
- [ ] Front-matter and end-matter chapters trigger static region scrolling without snapping.
- [ ] Reading progress, bookmarks, and notes persist across page reloads in `localStorage`.
