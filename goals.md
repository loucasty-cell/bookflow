# Bookflow Product Goals & Vision

This document outlines the verified product today and the technical roadmap for Bookflow.

---

## 1. Product Vision

Bookflow transforms long-form reading into a calm, sustainable, and habit-forming daily practice. It blends sentence-level cognitive ergonomics, privacy-first local document processing, bionic reading acceleration, and dopamine-aware product design to rival the pull of short-form feeds without cheapening the deep reading experience.

---

## 2. Non-Negotiable Invariants

1. Keep imported book contents on the user's device by default.
2. Preserve scroll-driven paragraph focus as the central experience.
3. Keep the active paragraph readable and softly highlighted without hiding nearby context.
4. Support keyboard, pointer, touch, desktop, tablet, and mobile use.
5. Avoid unnecessary services, tracking, dependencies, and visual distractions.
6. Describe current and planned features accurately.

---

## 3. Implemented Capabilities Matrix

| Capability | Status | Implementation Detail |
| --- | --- | --- |
| **Multi-Format Import** | Verified | PDF, EPUB, TXT, Markdown up to 50 MB with drag-and-drop |
| **Local-First Privacy** | Verified | In-memory parsing via PDF.js, JSZip, Tesseract.js WASM |
| **Sentence Focus Rail** | Verified | Golden-ratio focal placement (`FOCUS_RAIL_RATIO = 0.42`) |
| **Bionic Fixation Reading** | Verified | Dynamic grapheme weighting (`getFixationLength`) via pure React elements |
| **Accessible Typography** | Verified | Serif, Sans, Atkinson Hyperlegible, OpenDyslexic with letter tracking |
| **Scroll Intent Accumulator** | Verified | `useScrollPosition` and trackpad dampening to eliminate jitter |
| **Selection Context Tooltip** | Verified | Floating toolbar for notes, copying, and paragraph bookmarks |
| **Editorial Typography** | Verified | Drop caps, `.kw` highlights, `.pullq` quotes, `.insight-box` callouts |
| **Variable Reward Capsules** | Verified | Serendipitous chapter-completion capsules with flow sparkline |
| **4-Minute Drop-Off Re-Anchor**| Verified | Attention fatigue detection and ambient intervention modal |
| **Resilient Error Boundaries** | Verified | Subtree and root-level crash isolation with one-tap reset |
| **Paragraph Classification** | Verified | 7-category heuristic classifier (Dialogue, Action, Descriptive, etc.) |
| **Fast Visual OCR Engine** | Verified | Multi-tiered OCR (Fast native -> PaddleOCR -> Qwen2-VL) with SSE streaming |
| **Automated Testing Suite** | Verified | 12 Vitest suites (44 tests), 34 Pytest tests, 100% Pyright type safety |

---

## 4. Strategic Behavioral Roadmap

### Phase 1: Cognitive Retention & Drop-Off Mitigation (Active / Verified)
- Deploy telemetry for velocity decay detection around the 4-minute drop-off window (`InterventionModal`).
- Implement the non-modal Curiosity Gap and Loss Aversion ambient whisper engine.

### Phase 2: Variable Reward System (Active / Verified)
- Implement the Serendipitous Marginalia Capsule upon chapter completion (`VariableRewardCapsule`).
- Render the organic Cognitive Flow Sparkline in session recaps.

### Phase 3: Asynchronous In-Margin Social Layer (Planned)
- Launch SHA-256 paragraph hash matching (`/api/social/resonance`) for zero-data-leakage shared marginalia.
- Enable time-shifted reaction drift capsules (`/api/social/reactions`) for synchronized reader discovery.

### Phase 4: Local ONNX Inference & Layout Geometry (Planned)
- Add an INT8 quantized local ONNX OCR model for air-gapped environments.
- Add spatial multi-column layout sorting to eliminate column interleaving.
