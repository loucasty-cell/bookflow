# Bookflow Product Goals & Vision

This document outlines the verified product today and the technical roadmap for Bookflow.

---

## 1. Product Vision

Bookflow transforms long-form reading into a calm, sustainable, and habit-forming daily practice. It blends sentence-level cognitive ergonomics, privacy-first local document processing, and dopamine-aware product design to rival the addictive pull of short-form feeds without cheapening the reading experience.

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
| **Multi-Format Import** | Complete | PDF, EPUB, TXT, Markdown up to 50 MB |
| **Local-First Privacy** | Complete | In-memory parsing via PDF.js, JSZip, Tesseract.js WASM |
| **Sentence Focus Rail** | Complete | Golden-ratio focal placement (`FOCUS_RAIL_RATIO = 0.382`) |
| **Scroll Intent Accumulator** | Complete | Trackpad dampening to eliminate jitter |
| **Pinned Reading State** | Complete | Lock focus with `Escape`, `Space`, or tap |
| **Notes & Bookmarks** | Complete | Local browser storage with chapter anchors |
| **Fast Visual OCR** | Opt-in | Configured Hugging Face serverless model via FastAPI with SSE progress streaming |
| **Hugging Face Provider Check** | Complete | Rejects models that are not exposed by the selected Inference Provider |
| **Instant Intro Skip** | Complete | Click, keydown, and Skip button on opening video |
| **Cross-Page Hierarchy** | Complete | Dynamic chapter hierarchy reconstruction from `# Headings` |
| **Type Safety & Testing** | Complete | Pyright strict typing, Pydantic v2 aliases, 33 Vitest tests |

---

## 4. Strategic Behavioral Roadmap

### Phase 1: Cognitive Retention & Drop-Off Mitigation
- Deploy telemetry for velocity decay detection around the 4-minute drop-off window.
- Implement the non-modal Curiosity Gap and Loss Aversion ambient whisper engine.

### Phase 2: Variable Reward System
- Implement the Serendipitous Marginalia Capsule upon chapter completion.
- Render the organic Cognitive Flow Sparkline in session recaps.

### Phase 3: Asynchronous In-Margin Social Layer
- Launch SHA-256 paragraph hash matching for zero-data-leakage shared marginalia.
- Enable time-shifted reaction drift capsules for synchronized reader discovery.

### Phase 4: Local ONNX Inference & Layout Geometry
- Add an INT8 quantized local ONNX OCR model for air-gapped environments.
- Add spatial multi-column layout sorting to eliminate column interleaving.
