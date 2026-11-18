---
title: Agent Skills Architecture
type: reference
status: verified
updated: 2026-11-18
tags: [bookflow, agent, skills, tooling]
source-files: [agent/skills/animate/SKILL.md,agent/skills/animate-expo/SKILL.md,agent/skills/animation-vocabulary/SKILL.md,agent/skills/apple-design/SKILL.md,agent/skills/ask-sonner/SKILL.md,agent/skills/jules-agent/SKILL.md,agent/skills/reader-ergonomics-qa/SKILL.md]
---

# Agent Skills Architecture

Overview of the specialized engineering and design agent skills introduced under `agent/skills/`
(and mirrored in `.agents/skills/`) in commit `2bd9c81`.

These skills encode domain knowledge, heuristic checks, design taste, and testing protocols
tailored to Bookflow's architecture.

---

## 1. Skills Directory and Structure

Each skill conforms to the standard skill definition contract with a `SKILL.md` instruction file,
optional subagent profiles (`agents/openai.yaml`), and reference documentation.

```text
agent/skills/
├── animate/                   Core animation physics, spring timing, and transition polish
├── animate-expo/              React Native / Expo motion patterns (for mobile-native explorations)
├── animation-vocabulary/      Precision motion taxonomy (easing curves, springs, durations)
├── apple-design/              Apple Human Interface Guidelines (HIG) craft and tactile standards
├── ask-sonner/                Toast notification choreography and non-intrusive micro-feedback
├── backend-ocr-engineer/      FastAPI, PyMuPDF, and PaddleOCR pipeline maintenance
├── document-parser-specialist/PDF, EPUB, TXT, and Markdown parser verification and edge cases
├── find-animation-opportunities/Audit tools for discovering stiff or missing micro-interactions
├── improve-animations/        Refining frame pacing, GPU compositing, and reduced-motion paths
├── improve-bookflow-reader/   Specialized reader-engine enhancement and invariant auditing
├── jules-agent/               Autonomous task planning, runbooks, and multi-file refactoring
├── mobile-native/             Mobile responsive layout, touch target safety, and viewport limits
├── pick-ui-library/           Library evaluation against bundle budgets and dependency discipline
├── prototype/                 Rapid UI prototyping patterns and temporary experimental surfaces
├── reader-ergonomics-qa/      Sentence focus rail, bionic reading, and typography QA
├── review-animations/         Lighthouse, 60fps frame-rate audit, and WCAG 2.2.2/2.3.3 checks
└── write-swift/               Swift / macOS native integration reference (future desktop wraps)
```

---

## 2. Core Bookflow Workflows

### 2.1 Reader Ergonomics QA (`reader-ergonomics-qa`)
- Focuses on the sentence-focus reading rail (`FOCUS_RAIL_RATIO = 0.38`), scroll intent accumulation,
  bionic reading fixations, accessible typography (Atkinson Hyperlegible, OpenDyslexic), and keyboard
  navigation (`J`/`K`, `ArrowUp`/`ArrowDown`, `Space`, `Escape`).
- Enforces zero horizontal scroll at mobile breakpoints (`320px` to `430px`).
- Verifies touch target sizing (minimum 44x44px per Apple HIG / WCAG).

### 2.2 Apple Design Standards (`apple-design`)
- Guides the tactile, calm aesthetic of Bookflow's UI components.
- Governs liquid-glass backdrop blurs (`backdrop-filter`), subtle borders, refined dark-mode contrast,
  and deliberate typography hierarchies.
- Enforces restrained spring physics rather than bouncy or jarring transitions.

### 2.3 Document Parser Specialist (`document-parser-specialist`)
- Dedicated to the client-side parsing pipelines (`src/features/document-import/lib/`).
- Validates the 50 MB upload ceiling, format detection (`.pdf`, `.epub`, `.txt`, `.md`), heading
  hierarchy extraction, front-matter filtering, and graceful recovery from damaged or malformed documents.

### 2.4 Autonomous Refactoring & Runbooks (`jules-agent`)
- Standardized runbook execution patterns for multi-step tasks across Bookflow.
- Enforces strict verification protocols, minimal diffs, and evidence-backed claims before completing
  development branches.

---

## 3. Governance and Invariants

1. **Skills Must Not Bypass Project Invariants**: A skill advising an animation or UI pattern must
   still obey the core rules in `AGENTS.md` and [[Invariants]]:
   - Book text stays pure React text nodes.
   - Seductive details are kept off the reader canvas (g = -0.33 rule).
   - Reduced motion must always be respected.
2. **Dependencies Remain Restricted**: Skills that suggest external animation or UI packages (e.g.
   `sonner`, `framer-motion` add-ons) cannot be installed without explicit human user approval.

## 4. Related Notes

- [[00-Dashboard]] - vault entry point and verification baseline
- [[Agent Quickstart]] - fast orientation for AI agents
- [[Invariants]] - project non-negotiables
- [[Context Sync Protocol]] - documentation synchronization rules
- [[Verification Checklist]] - authoritative verification gates
