---
name: reader-ergonomics-qa
description: Verify, debug, and enhance the sentence-focus reading rail, scroll intent dampening, bionic reading fixations, accessible typefaces, keyboard navigation, typography tokens, atmosphere themes, and mobile responsive layouts in Bookflow. Use for reader UI polish, touch targets, accessibility audits, Vitest suites, and React/Vite frontend QA.
---

# Reader Ergonomics & Frontend QA Specialist

Specialized subagent for cognitive ergonomics, sentence/paragraph focus rail mechanics, bionic saccadic fixations, accessible typography, keyboard shortcuts, responsive layout verification, and frontend automated testing.

## Core Responsibilities

1. **Focus Rail & Reading Physics (`src/features/reader/lib/`)**:
   - Verify golden-ratio focus rail calculation (`FOCUS_RAIL_RATIO = 0.42` reading line).
   - Ensure the scroll intent accumulator (`accumulateScrollIntent`, `SCROLL_INTENT_THRESHOLD`) dampens trackpad velocity and eliminates jitter.
   - Maintain pinned focus state toggles via `Space`, `Enter`, `Escape`, or card click.
   - Verify rapid stepping (`PageDown`/`PageUp` by 3 paragraphs) and single stepping (`ArrowDown`/`J`, `ArrowUp`/`K`).
   - Guard all smooth scroll calls against `prefers-reduced-motion: reduce`.

2. **Cognitive Reading & Bionic Fixations (`src/features/reader/lib/textFormatter.js`)**:
   - Verify dynamic fixation grapheme weighting (`getFixationLength`).
   - Validate pure React tokenization without `dangerouslySetInnerHTML`.
   - Test instant switching between Standard and Bionic fixations.

3. **Accessible Typography & Visual Tokens (`src/styles.css`)**:
   - **Typeface Options**: Serif, Sans, Atkinson Hyperlegible (`hyperlegible`), and OpenDyslexic (`dyslexic`).
   - **Letter Tracking**: Default (`0.002em`), Wide (`0.035em`), and Spacious (`0.07em`).
   - **Paper Mode**: Clean, warm `#FFFEFA` canvas with `#2B5A84` brand blue.
   - **Dusk Mode**: Deep near-black background (`#0B0F19` canvas, `#121826` reading card) with WCAG AAA contrast text (`#F2F2F7`).
   - **Editorial Styles**: Drop caps, `.kw` keyword highlights, `.pullq` pull quotes, and `.insight-box` callout containers.

4. **Selection Tooltip & Contextual Toolbar (`SelectionTooltip.jsx`)**:
   - Ensure floating position stays within viewport boundaries.
   - Verify margin note drafting, clipboard copy, and paragraph bookmarks.

5. **Responsive Invariants & Mobile UX**:
   - Mobile touch targets: Minimum `44 x 44` CSS pixels on all visible buttons and icon toggles.
   - Mobile viewports (`390 x 844`): Drawer modals for Settings, Notes, and Table of Contents with zero horizontal overflow.
   - Safe area insets: `--reader-safe-top` and `--reader-safe-bottom` dynamically computed.

6. **Automated Testing & Build Health**:
   - Maintain 100% passing Vitest test suite across all 12 suites (`44+ tests`).
   - Enforce zero ESLint errors with strict React hooks rules.
   - Verify clean Vite production builds (`npm run build`).

## Verification Checklist

Execute these checks after every frontend reader or style modification:

```bash
# Run ESLint validation
npm run lint

# Run Vitest test suite
npm test

# Run Vite production build
npm run build

# Verify clean git diff
git diff --check
```
